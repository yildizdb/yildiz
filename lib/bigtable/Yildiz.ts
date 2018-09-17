import Bigtable, { FamilyRule } from "@google-cloud/bigtable";
import Debug from "debug";

import { NodeHandler } from "./graph/NodeHandler";
import { GraphAccess } from "./graph/GraphAccess";
import { Translator } from "./graph/Translator";

import { Lifetime } from "./db/Lifetime";
import { Metadata } from "./db/Metadata";

import { InMemory } from "./cache/InMemory";
import { LookupCache } from "./cache/LookupCache";
import { FetchJob } from "./cache/FetchJob";
import { RedisClient } from "./cache/RedisClient";

import { Metrics } from "./metrics/Metrics";

import { ServiceConfig } from "../interfaces/ServiceConfig";
import { YildizModel } from "../interfaces/Yildiz";

const debug = Debug("yildiz:main");

export class Yildiz {

    public config: ServiceConfig;
    public metrics!: Metrics;
    public metadata!: Metadata;
    public lookupCache!: LookupCache;
    public fetchJob!: FetchJob;
    public models!: YildizModel;
    public cache!: InMemory;

    private prefix: string;
    private translator: Translator;
    private bigtable!: Bigtable;
    private ttlJob!: Lifetime;
    private redisClient!: RedisClient;

    constructor(prefix: string = "kn", config: ServiceConfig) {

        this.prefix = prefix;
        this.config = config;
        this.translator = new Translator();
    }

    public getNodeHandler(): Promise<NodeHandler> {

        // Promisified because of future api relations
        return new Promise((resolve) => {
            resolve(new NodeHandler(this));
        });
    }

    public getGraphAccess(): Promise<GraphAccess> {

        return new Promise((resolve, reject) => {

            const access = new GraphAccess(this);

            access.init().then(() => {
                resolve(access);
            }).catch ((error: Error) => {
                reject(error);
            });
        });
    }

    public async getStats() {
        return {up: true};
    }

    public async getTranslator() {
        return this.translator;
    }

    public async incStat(key: string) {
        this.metrics.inc(key);
    }

    public async init() {

        let { clusters } = this.config.database;

        const {
            projectId,
            keyFilename,
        } = this.config.database;

        clusters = clusters || [];

        debug("init:", clusters, ". project:", projectId);

        this.bigtable = new Bigtable({
            projectId,
            keyFilename,
        });

        this.models = await this.generate();
        debug("sync done, ready to do work.");

        this.metrics = new Metrics(this.prefix);
        this.cache = new InMemory(this.config, this.metrics);
        this.metadata = new Metadata(this);
        await this.metadata.init();

        this.redisClient = new RedisClient(this.config, this.metrics);
        await this.redisClient.connect();

        this.lookupCache = new LookupCache(this.config, this.metrics, this.redisClient);
        this.fetchJob = new FetchJob(this.config, this, this.metrics, this.redisClient);

        debug("starting jobs");
        this.runJobs();
    }

    private async generate() {

        const start = Date.now();

        const {
            instanceName,
            columnFamilyName,
            maxAgeSeconds,
        } = this.config.database;

        const instance = this.bigtable.instance(instanceName);
        const instanceExists = await instance.exists();
        if (!instanceExists || !instanceExists[0]) {
            await instance.create();
        }

        // GENERATE tables
        const nodeTableName = `${this.prefix}_nodes`;
        const nodeTable = instance.table(nodeTableName);
        const nodeTableExists = await nodeTable.exists();
        if (!nodeTableExists || !nodeTableExists[0]) {
            await nodeTable.create(nodeTableName);
        }

        const ttlTableName = `${this.prefix}_ttl`;
        const ttlTable = instance.table(ttlTableName);
        const ttlTableExists = await ttlTable.exists();
        if (!ttlTableExists || !ttlTableExists[0]) {
            await ttlTable.create(ttlTableName);
        }

        const metadataTableName = `${this.prefix}_metadata`;
        const metadataTable = instance.table(metadataTableName);
        const metadataTableExists = await metadataTable.exists();
        if (!metadataTableExists || !metadataTableExists[0]) {
            await metadataTable.create(metadataTableName);
        }

        const popnodeTableName = `${this.prefix}_popnodes`;
        const popnodeTable = instance.table(popnodeTableName);
        const popnodeTableExists = await popnodeTable.exists();
        if (!popnodeTableExists || !popnodeTableExists[0]) {
            await popnodeTable.create(popnodeTableName);
        }

        const cacheTableName = `${this.prefix}_caches`;
        const cacheTable = instance.table(cacheTableName);
        const cacheTableExists = await cacheTable.exists();
        if (!cacheTableExists || !cacheTableExists[0]) {
            await cacheTable.create(cacheTableName);
        }

        // GENERATE columnFamilies

        const rule: FamilyRule = {
            versions: 1,
        };

        if (maxAgeSeconds) {
            rule.age = {
                seconds: maxAgeSeconds,
            };
            rule.union = true;
        }

        const columnFamilyNode = nodeTable.family("nodes");
        const columnFamilyNodeExists = await columnFamilyNode.exists();
        if (!columnFamilyNodeExists || !columnFamilyNodeExists[0]) {
            await columnFamilyNode.create({rule});
        }

        const columnFamilyTTL = ttlTable.family("ttl");
        const columnFamilyTTLExists = await columnFamilyTTL.exists();
        if (!columnFamilyTTLExists || !columnFamilyTTLExists[0]) {
            await columnFamilyTTL.create({rule});
        }

        const columnFamilyMetadata = metadataTable.family("metadata");
        const columnFamilyMetadataExists = await columnFamilyMetadata.exists();
        if (!columnFamilyMetadataExists || !columnFamilyMetadataExists[0]) {
            await columnFamilyMetadata.create({rule});
        }

        const columnFamilyPopnode = popnodeTable.family("popnodes");
        const columnFamilyPopnodeExists = await columnFamilyPopnode.exists();
        if (!columnFamilyPopnodeExists || !columnFamilyPopnodeExists[0]) {
            await columnFamilyPopnode.create({rule});
        }

        const columnFamilyCache = cacheTable.family("caches");
        const columnFamilyCacheExists = await columnFamilyCache.exists();
        if (!columnFamilyCacheExists || !columnFamilyCacheExists[0]) {
            await columnFamilyCache.create({rule});
        }

        debug(`Generate table and columnFamily done, took ${(Date.now() - start)} ms`);

        return {

            instance,

            nodeTable,
            ttlTable,
            metadataTable,
            popnodeTable,
            cacheTable,

            columnFamilyNode,
            columnFamilyTTL,
            columnFamilyMetadata,
            columnFamilyPopnode,
            columnFamilyCache,
        };
    }

    public async resetTables() {

        const start = Date.now();

        const { instanceName } = this.config.database;

        const instance = this.bigtable.instance(instanceName);

        // DELETE tables
        try {
            const nodeTableName = `${this.prefix}_nodes`;
            const nodeTable = instance.table(nodeTableName);
            await nodeTable.delete();
        } catch (error) {
            // Ignore if the table does not exist
        }

        try {
            const ttlTableName = `${this.prefix}_ttl`;
            const ttlTable = instance.table(ttlTableName);
            await ttlTable.delete();
        } catch (error) {
            // Ignore if the table does not exist
        }

        try  {
            const metadataTableName = `${this.prefix}_metadata`;
            const metadataTable = instance.table(metadataTableName);
            await metadataTable.delete();
        } catch (error) {
            // Ignore if the table does not exist
        }

        try  {
            const popnodeTableName = `${this.prefix}_popnodes`;
            const popnodeTable = instance.table(popnodeTableName);
            await popnodeTable.delete();
        } catch (error) {
            // Ignore if the table does not exist
        }

        try  {
            const cacheTableName = `${this.prefix}_caches`;
            const cacheTable = instance.table(cacheTableName);
            await cacheTable.delete();
        } catch (error) {
            // Ignore if the table does not exist
        }

        this.close();
    }

    private runJobs() {

        if (this.config.ttl && typeof this.config.ttl === "object") {
            this.ttlJob = new Lifetime(this, this.config);
            this.ttlJob.init();
        } else {
            debug("ttl job configuration missing.");
        }

        if (this.config.fetchJob && typeof this.config.fetchJob === "object") {
            this.fetchJob.init();
        } else {
            debug("fetch job configuration missing.");
        }

        if (this.config.lookupCache && typeof this.config.fetchJob === "object") {
            this.lookupCache.init();
        } else {
            debug("lookup cache job configuration missing.");
        }
    }

    public async close() {

        if (this.ttlJob) {
            this.ttlJob.close();
        }

        if (this.cache) {
            this.cache.clear();
        }

        if (this.lookupCache) {
            this.lookupCache.close();
        }

        if (this.fetchJob) {
            this.fetchJob.close();
        }

        if (this.redisClient) {
            await this.redisClient.close();
        }

        if (this.redisClient) {
            await this.redisClient.close();
        }

        if (this.redisClient) {
            await this.redisClient.close();
        }

        if (this.metadata) {
            this.metadata.close();
        }

        if (this.metrics) {
            this.metrics.close();
        }

        return false;
    }
}
