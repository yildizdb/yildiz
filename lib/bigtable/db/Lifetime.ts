import Debug from "debug";
import Bluebird from "bluebird";

import Bigtable, { StreamParam } from "@google-cloud/bigtable";

import { Yildiz } from "../Yildiz";
import { Metadata } from "./Metadata";
import { TTLConfig } from "../../interfaces/ServiceConfig";
import { Metrics } from "../metrics/Metrics";
import { RedisClient } from "../cache/RedisClient";
import { GenericObject } from "../../interfaces/Generic";

const debug = Debug("yildiz:lifetime");

const DEFAULT_JOB_INTERVAL_IN_SEC = 120;

export interface ExpiredTTL {
    ttlKey: string;
    cellQualifiers: string[];
  }

export class Lifetime {

    private yildiz: Yildiz;
    private configTTL: TTLConfig;
    private metadata: Metadata;
    private metrics: Metrics;
    private redisClient: RedisClient;

    private nodeTable: Bigtable.Table;
    private popnodeTable: Bigtable.Table;
    private cacheTable: Bigtable.Table;
    private ttlTable: Bigtable.Table;
    private ttlReferenceTable: Bigtable.Table;
    private columnFamilyNode: Bigtable.Family;
    private columnFamilyTTL: Bigtable.Family;

    private tov!: NodeJS.Timer | number;

    private lifeTimeInSec!: number;
    private promiseConcurrency: number;

    constructor(yildiz: Yildiz) {

        this.yildiz = yildiz;

        const {
            nodeTable,
            popnodeTable,
            cacheTable,
            ttlTable,
            ttlReferenceTable,
            columnFamilyNode,
            columnFamilyTTL,
        } = this.yildiz.models;

        this.metadata = this.yildiz.metadata;
        this.metrics = this.yildiz.metrics;
        this.redisClient = this.yildiz.redisClient;

        this.configTTL = this.yildiz.config.ttl;
        this.nodeTable = nodeTable;
        this.popnodeTable = popnodeTable;
        this.cacheTable = cacheTable;
        this.ttlTable = ttlTable;
        this.ttlReferenceTable = ttlReferenceTable;

        this.columnFamilyNode = columnFamilyNode;
        this.columnFamilyTTL = columnFamilyTTL;
        this.promiseConcurrency = this.yildiz.config.promiseConcurrency || 1000;
    }

    private streamTTL(options: StreamParam, etl: (result: Bigtable.GenericObject) => any): Bluebird<any[]> {

        return new Bluebird((resolve, reject) => {

            const results: any[] = [];

            this.ttlTable.createReadStream(options)
                .on("error", (error: Error) => {
                    reject(error);
                })
                .on("data", (result: GenericObject) => {
                    if (etl) {
                        if (etl(result)) {
                            results.push(etl(result));
                        }
                    } else {
                        results.push(result);
                    }
                })
                .on("end", () => {
                    resolve(results);
                });
        });
    }

    private async getTTLIds(type: string) {

        const currentTimestamp = Date.now();
        const etl = (result: any) => ({
          ttlKey: result.id,
          cellQualifiers: Object.keys(result.data[this.columnFamilyTTL.id]),
        });

        const options: StreamParam = {
          ranges: [{
              start: `ttl#${type}#0`,
              end: `ttl#${type}#${currentTimestamp}`,
          }],
          limit: this.promiseConcurrency,
        };

        const expiredTTLs = await this.streamTTL(options, etl);

        return expiredTTLs;
    }

    private getCellQualifiers(expiredTTLs: ExpiredTTL[]) {

        return ([] as string[])
            .concat(
                ...expiredTTLs
                    .map((expiredTTL: ExpiredTTL) => expiredTTL.cellQualifiers),
            );
    }

    private getTTLKeys(expiredTTLs: ExpiredTTL[]) {

        return ([] as string[])
            .concat(
                ...expiredTTLs
                    .map((expiredTTL: ExpiredTTL) => expiredTTL.ttlKey),
            );
    }

    private getTTLReferenceKeys(type: string, expiredKeys: string[]) {

        return expiredKeys
            .map((expiredKey) => `reference#${type}#${expiredKey}`);
    }

    private deleteTable() {

        const remove = (type: string) => {

            return async (keys: string[]) => {

                if (!keys || !keys.length) {
                    return { success: 0 };
                }

                let table: Bigtable.Table | null = null;
                let family: string | null = null;

                switch (type) {
                    case "nodes":
                        table = this.nodeTable;
                        break;
                    case "edges":
                        table = this.nodeTable;
                        family = this.columnFamilyNode.id;
                        break;
                    case "popnodes":
                        table = this.popnodeTable;
                        break;
                    case "caches":
                        table = this.cacheTable;
                        break;
                    case "ttls":
                        table = this.ttlTable;
                        break;
                    case "ttlReferences":
                        table = this.ttlReferenceTable;
                        break;
                }

                if (!table) {
                    return { success: 0 };
                }

                const mutateRules = type === "edges" ?
                    keys
                        .map((key: string) => ({
                            method: "delete",
                            key: key.split(":")[0],
                            data: [ `${family}:${key.split(":")[1]}` ],
                        }))
                    :
                    keys
                        .map((key: string) => ({
                            method: "delete",
                            key,
                        }));

                await table.mutate(mutateRules);

                this.metrics.inc(`ttl_${type}_removes`, keys.length);

                if (this.metadata) {
                    this.metadata.decreaseCount(type, keys.length);
                }

                return { success: keys.length };
            };
        };

        return {
            node: remove("nodes"),
            popnode: remove("popnodes"),
            edge: remove("edges"),
            cache: remove("caches"),
            ttl: remove("ttls"),
            ttlReference: remove("ttlReferences"),
        };
    }

    public init() {

        const {
            active = false,
            jobIntervalInSec = DEFAULT_JOB_INTERVAL_IN_SEC,
        } = this.configTTL || {};

        if (!active) {
            return debug("ttl job deactivated.");
        }

        debug(`ttl job active running every ${jobIntervalInSec} sec`);

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
        const fetchStart = Date.now();

        // Get all the keys that need to be deleted
        const [ nodeTTLKeys, edgeTTLKeys, popnodeTTLKeys, cacheTTLKeys] =
            await Bluebird.all([
                this.getTTLIds("nodes"),
                this.getTTLIds("edges"),
                this.getTTLIds("popnodes"),
                this.getTTLIds("caches"),
            ]);

        const nodeKeys = this.getCellQualifiers(nodeTTLKeys);
        const edgeKeys = this.getCellQualifiers(edgeTTLKeys);
        const popnodeKeys = this.getCellQualifiers(popnodeTTLKeys);
        const cacheKeys = this.getCellQualifiers(cacheTTLKeys);

        this.metrics.set("ttl_fetch_duration", Date.now() - fetchStart);

        const executionStart = Date.now();
        // Delete all the keys that are needed to be deleted
        const results = await Bluebird.all([
            deleteTTLOrigin.node(nodeKeys),
            deleteTTLOrigin.edge(edgeKeys),
            deleteTTLOrigin.popnode(popnodeKeys),
            deleteTTLOrigin.cache(cacheKeys),
        ]);

        const ttlKeys = ([] as string[]).concat(
            this.getTTLKeys(nodeTTLKeys),
            this.getTTLKeys(edgeTTLKeys),
            this.getTTLKeys(popnodeTTLKeys),
            this.getTTLKeys(cacheTTLKeys),
        );

        const ttlReferencekeys = ([] as string[]).concat(
            this.getTTLReferenceKeys("nodes", nodeKeys),
            this.getTTLReferenceKeys("edges", edgeKeys),
            this.getTTLReferenceKeys("popnodes", popnodeKeys),
            this.getTTLReferenceKeys("caches", cacheKeys),
        );

        await Bluebird.all([
            deleteTTLOrigin.ttl(ttlKeys),
            deleteTTLOrigin.ttlReference(ttlReferencekeys),
        ]);

        this.metrics.set("ttl_delete_execution_duration", Date.now() - executionStart);

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
