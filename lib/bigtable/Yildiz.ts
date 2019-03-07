import Bigtable, { FamilyRule } from "@google-cloud/bigtable";
import Debug from "debug";
import Bluebird from "bluebird";

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
    public redisClient!: RedisClient;

    private prefix: string;
    private translator: Translator;
    private bigtable!: Bigtable;
    private ttlJob!: Lifetime;

    constructor(prefix: string = "kn", config: ServiceConfig) {

        this.prefix = prefix;
        this.config = config;
        this.translator = new Translator();
    }

    public getNodeHandler(): Bluebird<NodeHandler> {

        // Promisified because of future api relations
        return new Bluebird((resolve) => {
            resolve(new NodeHandler(this));
        });
    }

    public getGraphAccess(): Bluebird<GraphAccess> {

        return new Bluebird((resolve, reject) => {

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

    public async init(lastUpdated?: number) {

        let { clusters } = this.config.database;
        const hasRun = lastUpdated ? true : false;

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

        this.models = await this.generate(hasRun);
        debug("sync done, ready to do work.");

        this.metrics = new Metrics(this.prefix);
        this.cache = new InMemory(this.config, this.metrics);
        this.metadata = new Metadata(this);
        this.redisClient = new RedisClient(this.config, this.metrics, this.prefix);

        try {
            await this.metadata.init();
            await this.redisClient.connect();
        } catch (error) {
            debug(error);
        }

        this.lookupCache = new LookupCache(this.config, this.metrics, this.redisClient);
        this.fetchJob = new FetchJob(this, this.metrics, this.redisClient);

        debug("starting jobs");
        this.runJobs();
    }

    private async generate(hasRun: boolean) {

        const start = Date.now();

        const {
            instanceName,
            columnFamilyName,
            maxAgeSeconds,
        } = this.config.database;

        const instance = this.bigtable.instance(instanceName);

        if (!hasRun) {
            const instanceExists = await instance.exists();
            if (!instanceExists || !instanceExists[0]) {
                await instance.create();
            }
        }

        const nodeTableName = `${this.prefix}_nodes`;
        const nodeTable = instance.table(nodeTableName);

        const ttlTableName = `${this.prefix}_ttl`;
        const ttlTable = instance.table(ttlTableName);

        const metadataTableName = `${this.prefix}_metadata`;
        const metadataTable = instance.table(metadataTableName);

        const popnodeTableName = `${this.prefix}_popnodes`;
        const popnodeTable = instance.table(popnodeTableName);

        const cacheTableName = `${this.prefix}_caches`;
        const cacheTable = instance.table(cacheTableName);

        const ttlReferenceTableName = `${this.prefix}_ttl_reference`;
        const ttlReferenceTable = instance.table(ttlReferenceTableName);

        // GENERATE tables if it wasn't the first run
        if (!hasRun) {

            try {

                const [
                    nodeTableExists,
                    ttlTableExists,
                    metadataTableExists,
                    popnodeTableExists,
                    cacheTableExists,
                    ttlReferenceTableExists,
                ] = await Bluebird.all([
                    nodeTable.exists(),
                    ttlTable.exists(),
                    metadataTable.exists(),
                    popnodeTable.exists(),
                    cacheTable.exists(),
                    ttlReferenceTable.exists(),
                ]);
    
                await Bluebird.all([
                    !nodeTableExists || !nodeTableExists[0] ?
                        nodeTable.create(nodeTableName) : Bluebird.resolve(),
                    !ttlTableExists || !ttlTableExists[0] ?
                        ttlTable.create(ttlTableName) : Bluebird.resolve(),
                    !metadataTableExists || !metadataTableExists[0] ?
                        metadataTable.create(metadataTableName) : Bluebird.resolve(),
                    !popnodeTableExists || !popnodeTableExists[0] ?
                        popnodeTable.create(popnodeTableName) : Bluebird.resolve(),
                    !cacheTableExists || !cacheTableExists[0] ?
                        cacheTable.create(cacheTableName) : Bluebird.resolve(),
                    !ttlReferenceTableExists || !ttlReferenceTableExists[0] ?
                        ttlReferenceTable.create(ttlReferenceTableName) : Bluebird.resolve(),
                ]);

            } catch(error) {
                debug(error);
            }

        }

        const columnFamilyNode = nodeTable.family("nodes");
        const columnFamilyTTL = ttlTable.family("ttl");
        const columnFamilyMetadata = metadataTable.family("metadata");
        const columnFamilyPopnode = popnodeTable.family("popnodes");
        const columnFamilyCache = cacheTable.family("caches");
        const columnFamilyTTLReference = ttlReferenceTable.family("ttlReference");
        
        // GENERATE columnFamilies if it wasn't the first run
        if (!hasRun) {

            const rule: FamilyRule = {
                versions: 1,
            };
    
            if (maxAgeSeconds) {
                rule.age = {
                    seconds: maxAgeSeconds,
                };
                rule.union = true;
            }

            try {
                const [
                    columnFamilyNodeExists,
                    columnFamilyTTLExists,
                    columnFamilyMetadataExists,
                    columnFamilyPopnodeExists,
                    columnFamilyCacheExists,
                    columnFamilyTTLReferenceExists,
                ] = await Bluebird.all([
                    columnFamilyNode.exists(),
                    columnFamilyTTL.exists(),
                    columnFamilyMetadata.exists(),
                    columnFamilyPopnode.exists(),
                    columnFamilyCache.exists(),
                    columnFamilyTTLReference.exists(),
                ])
    
                await Bluebird.all([
                    !columnFamilyNodeExists || !columnFamilyNodeExists[0] ?
                        columnFamilyNode.create({rule}) : Bluebird.resolve(),
                    !columnFamilyTTLExists || !columnFamilyTTLExists[0] ?
                        columnFamilyTTL.create({rule}) : Bluebird.resolve(),
                    !columnFamilyMetadataExists || !columnFamilyMetadataExists[0] ?
                        columnFamilyMetadata.create({rule}) : Bluebird.resolve(),
                    !columnFamilyPopnodeExists || !columnFamilyPopnodeExists[0] ?
                        columnFamilyPopnode.create({rule}) : Bluebird.resolve(),
                    !columnFamilyCacheExists || !columnFamilyCacheExists[0] ?
                        columnFamilyCache.create({rule}) : Bluebird.resolve(),
                    !columnFamilyTTLReferenceExists || !columnFamilyTTLReferenceExists[0] ?
                        columnFamilyTTLReference.create({rule}) : Bluebird.resolve(),
                ]);
            } catch(error) {
                debug(error);
            }

        }


        debug(`Generate table and columnFamily done, took ${(Date.now() - start)} ms`);

        return {

            instance,

            nodeTable,
            ttlTable,
            metadataTable,
            popnodeTable,
            cacheTable,
            ttlReferenceTable,

            columnFamilyNode,
            columnFamilyTTL,
            columnFamilyMetadata,
            columnFamilyPopnode,
            columnFamilyCache,
            columnFamilyTTLReference,
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
            this.ttlJob = new Lifetime(this);
            this.ttlJob.init();
        } else {
            debug("ttl job configuration missing.");
        }

        if (this.config.fetchJob && typeof this.config.fetchJob === "object") {
            this.fetchJob.init();
        } else {
            debug("fetch job configuration missing.");
        }

        if (this.config.lookupCache && typeof this.config.lookupCache === "object") {
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
