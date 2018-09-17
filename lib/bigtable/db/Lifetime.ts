import moment from "moment";
import Debug from "debug";

import Bigtable from "@google-cloud/bigtable";

import { Yildiz } from "../Yildiz";
import { Metadata } from "./Metadata";
import { ServiceConfig, TTLConfig } from "../../interfaces/ServiceConfig";
import { Metrics } from "../metrics/Metrics";
import { YildizSingleSchema } from "../../interfaces/Yildiz";

const debug = Debug("yildiz:lifetime");

const CACHE_TABLE_TTL = 175;
const DEFAULT_LIFETIME_IN_SEC = 86400;
const DEFAULT_JOB_INTERVAL_IN_SEC = 120;

export class Lifetime {

    private yildiz: Yildiz;
    private configTTL: TTLConfig;
    private metadata: Metadata;
    private metrics: Metrics;

    private ttlTable: Bigtable.Table;
    private nodeTable: Bigtable.Table;
    private popnodeTable: Bigtable.Table;
    private cacheTable: Bigtable.Table;
    private columnFamilyNode: Bigtable.Family;

    private tov!: NodeJS.Timer | number;

    private lifeTimeInSec!: number;

    constructor(yildiz: Yildiz, config: ServiceConfig) {

        this.yildiz = yildiz;

        const {
            ttlTable,
            nodeTable,
            popnodeTable,
            cacheTable,
            columnFamilyNode,
        } = this.yildiz.models;

        this.metadata = this.yildiz.metadata;
        this.metrics = this.yildiz.metrics;

        this.configTTL = config.ttl;
        this.ttlTable = ttlTable;
        this.nodeTable = nodeTable;
        this.popnodeTable = popnodeTable;
        this.cacheTable = cacheTable;

        this.columnFamilyNode = columnFamilyNode;
    }

    private getTTLIds(type: string): Promise<string[]> {

        return new Promise((resolve, reject) => {

            if (!type) {
                resolve([]);
            }

            const results: string[] = [];

            const lifetime = type === "caches" ? CACHE_TABLE_TTL : this.lifeTimeInSec;

            this.ttlTable.createReadStream({
                filter: [{
                    row: new RegExp(`.*${type}$`),
                },
                {
                    time: {
                        start: moment().subtract(1, "year").toDate(),
                        end: moment().subtract(lifetime, "seconds").toDate(),
                    },
                }],
            })
            .on("error", (error: Error) => {
                reject(error);
            })
            .on("data", (result: YildizSingleSchema) => {
                if (result.id) {
                    results.push(result.id as string);
                }
            })
            .on("end", () => {
                resolve(results);
            });
        });
    }

    private deleteTable() {

        const remove = (type: string) => {

            return async (keys: string[]) => {

                const metadataType = type + "s";

                let cleanedKeys = keys;
                let deletedCounts = [];

                // If it is not ttl, need to get the real key
                if (type !== "ttl") {
                    cleanedKeys = keys.map((keyRaw) => keyRaw.split("_")[0]);
                }

                // If it is not edge, just delete the row from the table
                if (type !== "edge") {

                    deletedCounts = await Promise.all(
                        cleanedKeys.map((key) => {

                            if (type === "node") {
                                this.nodeTable.row(key).delete();
                            }

                            if (type === "popnode") {
                                this.popnodeTable.row(key).delete();
                            }

                            if (type === "cache") {
                                this.cacheTable.row(key).delete();
                            }
                        }),
                    );
                }

                // If it is edge, need to get the nodeKey and remove the cell on the node table
                if (type === "edge") {

                    const cfName = this.columnFamilyNode.id;

                    deletedCounts = await Promise.all(
                        cleanedKeys.map((key) => {
                            const nodeKey = key.split("-")[0];
                            const columnKey = key.split("-")[1];

                            return this.nodeTable.row(nodeKey).deleteCells([
                                `${cfName}:${columnKey}`,
                            ]);
                        },
                    ));

                }

                if (deletedCounts.length) {
                    this.metrics.inc(`ttl_${type}_removes`, deletedCounts.length);
                }

                if (this.metadata) {
                    this.metadata.decreaseCount(metadataType, deletedCounts.length);
                }

                return { success: deletedCounts.length };
            };
        };

        return {
            node: remove("node"),
            popnode: remove("popnode"),
            edge: remove("edge"),
            ttl: remove("ttl"),
            cache: remove("cache"),
        };
    }

    public init() {

        const {
            active = false,
            lifeTimeInSec = DEFAULT_LIFETIME_IN_SEC,
            jobIntervalInSec = DEFAULT_JOB_INTERVAL_IN_SEC,
        } = this.configTTL || {};

        if (!active) {
            return debug("ttl job deactivated.");
        }

        this.lifeTimeInSec = lifeTimeInSec;

        debug(`ttl job active running every ${jobIntervalInSec} sec,
            deleting all ttld flags after ${lifeTimeInSec} sec.`);

        this.runJob(jobIntervalInSec);
    }

    private runJob(jobIntervalInSec: number) {

        this.tov = setTimeout(() => {

            const startTime = Date.now();
            this.job().then((affected) => {
                const diff = Date.now() - startTime;

                debug(`ttl job done took ${diff} ms, removed ${affected.rowCount} rows,
                    from ${affected.tableCount} tables.`);

                this.metrics.inc("ttl_job_runs");
                this.metrics.set("ttl_job_duration", diff);

                this.runJob(jobIntervalInSec);
            }).catch((error: Error) => {

                debug("ttl job failed.", error);
                this.runJob(jobIntervalInSec);
            });
        }, jobIntervalInSec * 1000);
    }

    private async job() {

        const deleteTTLOrigin = this.deleteTable();

        const results = [];

        // Remove Nodes and TTLs
        const nodeKeys = await this.getTTLIds("nodes");
        results.push(await deleteTTLOrigin.node(nodeKeys));

        const edgeKeys = await this.getTTLIds("edges");
        results.push(await deleteTTLOrigin.edge(edgeKeys));

        const popnodeKeys = await this.getTTLIds("popnodes");
        results.push(await deleteTTLOrigin.popnode(popnodeKeys));

        const cacheKeys = await this.getTTLIds("caches");
        results.push(await deleteTTLOrigin.cache(cacheKeys));

        const ttlKeys = nodeKeys
            .concat(edgeKeys ? edgeKeys : [])
            .concat(popnodeKeys ? popnodeKeys : [])
            .concat(cacheKeys ? cacheKeys : []);

        results.push(await deleteTTLOrigin.ttl(ttlKeys));

        return {
            rowCount: results.map((n) => n.success).reduce((a, b) => a + b, 0),
            tableCount: results.length,
        };
    }

    public close() {
        if (this.tov) {
            debug("stopping ttl job.");
            if (this.tov) {
                clearTimeout(this.tov as NodeJS.Timer);
            }
        }
    }
}
