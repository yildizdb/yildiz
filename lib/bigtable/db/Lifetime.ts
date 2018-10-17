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

const TYPE_NODES = "nodes";
const TYPE_EDGES = "edges";
const TYPE_POPNODES = "popnodes";
const TYPE_CACHES = "caches";
const TYPE_TTLS = "ttls";

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
            columnFamilyNode,
            ttlTable,
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
        this.metrics.set("ttl_fetch_range_scan_duration", Date.now() - currentTimestamp);

        return expiredTTLs;
    }

    private async getCellQualifiers(expiredTTLs: ExpiredTTL[], type: string) {

        const currentTimestamp = Date.now();

        const identifiers = ([] as string[])
            .concat(
                ...expiredTTLs
                    .map((expiredTTL: ExpiredTTL) => expiredTTL.cellQualifiers),
            );

        const options: StreamParam = {
            keys: identifiers.map((identifier: string) => `ttlIdentifier#${type}$${identifier}`),
        };

        const etl = (result: any) => {
            let identifier = null;
            try {
                const timestamp = result.data[this.columnFamilyTTL.id].ttl[0].value;
                identifier = currentTimestamp > timestamp ? result.id.split("$")[1] : null;
            } catch (error) {
                // Do nothing
            }
            return identifier;
        };

        const expiredIdentifiers = await this.streamTTL(options, etl);
        this.metrics.set("ttl_fetch_get_expired_ids_duration", Date.now() - currentTimestamp);

        return expiredIdentifiers;
    }

    private getTTLCrossCheckIdentifiers(identifiers: string[], type: string) {
        return identifiers.map((identifier: string) => `ttlIdentifier#${type}$${identifier}`);
    }

    private getTTLKeys(expiredTTLs: ExpiredTTL[]) {

        return ([] as string[])
            .concat(
                ...expiredTTLs
                    .map((expiredTTL: ExpiredTTL) => expiredTTL.ttlKey),
            );
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
                    case TYPE_NODES:
                        table = this.nodeTable;
                        break;
                    case TYPE_EDGES:
                        table = this.nodeTable;
                        family = this.columnFamilyNode.id;
                        break;
                    case TYPE_POPNODES:
                        table = this.popnodeTable;
                        break;
                    case TYPE_CACHES:
                        table = this.cacheTable;
                        break;
                    case TYPE_TTLS:
                        table = this.ttlTable;
                        break;
                }

                if (!table) {
                    return { success: 0 };
                }

                const mutateRules = type === TYPE_EDGES ?
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
            node: remove(TYPE_NODES),
            popnode: remove(TYPE_POPNODES),
            edge: remove(TYPE_EDGES),
            cache: remove(TYPE_CACHES),
            ttl: remove(TYPE_TTLS),
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
                this.getTTLIds(TYPE_NODES),
                this.getTTLIds(TYPE_EDGES),
                this.getTTLIds(TYPE_POPNODES),
                this.getTTLIds(TYPE_CACHES),
            ]);

        const [ nodeKeys, edgeKeys, popnodeKeys, cacheKeys ] =
            await Bluebird.all([
                this.getCellQualifiers(nodeTTLKeys, TYPE_NODES),
                this.getCellQualifiers(edgeTTLKeys, TYPE_EDGES),
                this.getCellQualifiers(popnodeTTLKeys, TYPE_POPNODES),
                this.getCellQualifiers(cacheTTLKeys, TYPE_CACHES),
            ]);

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

        const ttlCrossCheckKeys = ([] as string[]).concat(
            this.getTTLCrossCheckIdentifiers(nodeKeys, TYPE_NODES),
            this.getTTLCrossCheckIdentifiers(edgeKeys, TYPE_EDGES),
            this.getTTLCrossCheckIdentifiers(popnodeKeys, TYPE_POPNODES),
            this.getTTLCrossCheckIdentifiers(cacheKeys, TYPE_CACHES),
        );

        const wholeTTLKeys = ttlKeys.concat(ttlCrossCheckKeys);

        await deleteTTLOrigin.ttl(ttlKeys.concat(ttlCrossCheckKeys));

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
