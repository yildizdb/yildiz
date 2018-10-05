import Debug from "debug";
import Bluebird from "bluebird";

import Bigtable from "@google-cloud/bigtable";

import { Yildiz } from "../Yildiz";
import { Metadata } from "./Metadata";
import { TTLConfig } from "../../interfaces/ServiceConfig";
import { Metrics } from "../metrics/Metrics";
import { RedisClient } from "../cache/RedisClient";

const debug = Debug("yildiz:lifetime");

const CACHE_TABLE_TTL = 175;
const DEFAULT_LIFETIME_IN_SEC = 86400;
const DEFAULT_JOB_INTERVAL_IN_SEC = 120;

export class Lifetime {

    private yildiz: Yildiz;
    private configTTL: TTLConfig;
    private metadata: Metadata;
    private metrics: Metrics;
    private redisClient: RedisClient;

    private nodeTable: Bigtable.Table;
    private popnodeTable: Bigtable.Table;
    private cacheTable: Bigtable.Table;
    private columnFamilyNode: Bigtable.Family;

    private tov!: NodeJS.Timer | number;

    private lifeTimeInSec!: number;
    private promiseConcurrency: number;

    constructor(yildiz: Yildiz) {

        this.yildiz = yildiz;

        const {
            nodeTable,
            popnodeTable,
            cacheTable,
            columnFamilyNode,
        } = this.yildiz.models;

        this.metadata = this.yildiz.metadata;
        this.metrics = this.yildiz.metrics;
        this.redisClient = this.yildiz.redisClient;

        this.configTTL = this.yildiz.config.ttl;
        this.nodeTable = nodeTable;
        this.popnodeTable = popnodeTable;
        this.cacheTable = cacheTable;

        this.columnFamilyNode = columnFamilyNode;
        this.promiseConcurrency = this.yildiz.config.promiseConcurrency || 1000;
    }

    private getTTLIds(type: string): Bluebird<string[]> {

        const ttlTimestamp = Date.now() - (type === "cache" ? CACHE_TABLE_TTL : this.lifeTimeInSec);
        return this.redisClient.getTTL(type, ttlTimestamp);
    }

    private deleteTable() {

        const remove = (type: string) => {

            return async (keys: string[]) => {

                const metadataType = type + "s";

                let deletedCounts = [];

                if (!keys || !keys.length) {
                    return { success: 0 };
                }

                // If it is not edge, just delete the row from the table
                if (type !== "edge") {

                    deletedCounts = await Bluebird.map(
                        keys,
                        (key) => {

                            if (type === "node") {
                                return this.nodeTable.row(key).delete();
                            }

                            if (type === "popnode") {
                                return this.popnodeTable.row(key).delete();
                            }

                            if (type === "cache") {
                                return this.cacheTable.row(key).delete();
                            }
                        },
                        {
                            concurrency: this.promiseConcurrency,
                        },
                    );
                }

                // If it is edge, need to get the nodeKey and remove the cell on the node table
                if (type === "edge") {

                    const cfName = this.columnFamilyNode.id;

                    deletedCounts = await Bluebird.map(
                        keys,
                        (key) => {
                            const nodeKey = key.split("-")[0];
                            const columnKey = key.split("-")[1];

                            return this.nodeTable.row(nodeKey).deleteCells([
                                `${cfName}:${columnKey}`,
                            ]);
                        },
                        {
                            concurrency: this.promiseConcurrency,
                        },
                    );

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

        debug(`ttl job active running every ${jobIntervalInSec} sec,` +
            `deleting all ttld flags after ${lifeTimeInSec} sec.`);

        this.runJob(jobIntervalInSec);
    }

    private runJob(jobIntervalInSec: number) {

        this.tov = setTimeout(() => {

            const startTime = Date.now();
            this.job().then((affected) => {
                const diff = Date.now() - startTime;

                debug(`ttl job done took ${diff} ms, removed ${affected.rowCount} rows,` +
                    `from ${affected.tableCount} tables.`);

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

        // Get all the keys that need to be deleted
        const [ nodeKeys, edgeKeys, popnodeKeys, cacheKeys] =
            await Bluebird.all([
                this.getTTLIds("node"),
                this.getTTLIds("edge"),
                this.getTTLIds("popnode"),
                this.getTTLIds("cache"),
            ]);

        // Delete all the keys that are needed to be deleted
        const results = await Bluebird.all([
            deleteTTLOrigin.node(nodeKeys),
            deleteTTLOrigin.edge(edgeKeys),
            deleteTTLOrigin.popnode(popnodeKeys),
            deleteTTLOrigin.cache(cacheKeys),
        ]);

        // Delete the keys in redis
        await Bluebird.all([
            this.redisClient.clearTTL("node", nodeKeys),
            this.redisClient.clearTTL("edge", edgeKeys),
            this.redisClient.clearTTL("popnode", popnodeKeys),
            this.redisClient.clearTTL("cache", cacheKeys),
        ]);

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
