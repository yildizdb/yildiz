"use strict";

const Promise = require("bluebird");
const Debug = require("debug");
const debug = Debug("yildiz:main");
const Bigtable = require("@google-cloud/bigtable");

const NodeHandler = require("./graph/NodeHandler.js");
const Translator = require("./graph/Translator.js");
const GraphAccess = require("./graph/GraphAccess.js");

const Lifetime = require("./db/Lifetime.js");
const Metadata = require("./db/Metadata.js");

const InMemory = require("./cache/InMemory.js");
const LookupCache = require("./cache/LookupCache.js");
const FetchJob = require("./cache/FetchJob");
const RedisClient = require("./cache/RedisClient.js");

const Metrics = require("./metrics/Metrics.js");

class Yildiz {

    constructor(prefix = "kn", config = {}){

        this.prefix = prefix;
        this.config = config;

        if(!this.config.database){
            this.config.database = {};
        }

        if(!this.config.cache){
            this.config.cache = {};
        }

        this.bigtable = null;
        this.models = null;
        this.metrics = null;
        this.cache = null;

        this.metadata = null;
        this.ttlJob = null;
    }

    getNodeHandler(){

        //promisified because of future api relations
        return new Promise(resolve => {
            resolve(new NodeHandler(this));
        });
    }

    getGraphAccess(){

        return new Promise((resolve, reject) => {

            const access = new GraphAccess(this);

            access.init().then(() => {
                resolve(access);
            }).catch(error => {
                reject(error);
            });
        });
    }

    getTranslator() {
        return new Translator();
    }

    async getStats(){
        return {up: true};
    }

    async incStat(key) {
        this.metrics.inc(key);
    }

    async init(/* no options used anymore */){

        let {
            clusters,
            projectId,
            keyFilename
        } = this.config.database;

        clusters = clusters || [];

        debug("init:", clusters, ". project:", projectId);

        this.bigtable = new Bigtable({ 
            projectId,
            keyFilename
        });

        this.models = await this._generate();
        debug("sync done, ready to do work.");
        

        this.metadata = new Metadata(this);
        this.metrics = new Metrics(this.prefix);
        this.cache = new InMemory(this.config.cache, this.metrics);

        this.redisClient = new RedisClient(this.config, this.metrics);
        await this.redisClient.connect();

        this.lookupCache = new LookupCache(this.config, this.metrics, this.redisClient);
        this.fetchJob = new FetchJob(this.config, this, this.metrics, this.redisClient);

        debug("starting jobs");
        this._runJobs();
    }

    async _generate(){

        const start = Date.now();

        let {
            instanceName,
            columnFamilyName,
            maxAgeSeconds
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

        const rule = {
            versions: 1
        };

        if (maxAgeSeconds) {
            rule.age = {
                seconds: maxAgeSeconds
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
            columnFamilyCache
        };
    }


    async resetTables(){

        const start = Date.now();

        let {
            instanceName
        } = this.config.database;

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
        } catch(error) {
            // Ignore if the table does not exist
        }

        try  {
            const metadataTableName = `${this.prefix}_metadata`;
            const metadataTable = instance.table(metadataTableName);
            await metadataTable.delete();
        } catch(error) {
            // Ignore if the table does not exist
        }

        try  {
            const popnodeTableName = `${this.prefix}_popnodes`;
            const popnodeTable = instance.table(popnodeTableName);
            await popnodeTable.delete();
        } catch(error) {
            // Ignore if the table does not exist
        }

        try  {
            const cacheTableName = `${this.prefix}_caches`;
            const cacheTable = instance.table(cacheTableName);
            await cacheTable.delete();
        } catch(error) {
            // Ignore if the table does not exist
        }
        

        this.close();
    }

    _runJobs(){

        if(this.config.ttl && typeof this.config.ttl === "object"){
            this.ttlJob = new Lifetime(this, this.config.ttl);
        } else {
            debug("ttl job configuration missing.");
        }

        if(this.config.fetchJob && typeof this.config.fetchJob === "object"){
            this.fetchJob.init();
        } else {
            debug("fetch job configuration missing.");
        }
    }

    async close(){

        if(this.ttlJob){
            this.ttlJob.close();
        }

        if(this.cache){
            this.cache.clear();
        }

        if(this.lookupCache){
            this.lookupCache.close();
        }

        if(this.fetchJob){
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

        if(this.metadata) {
            this.metadata.close();
        }

        if(this.metrics) {
            this.metrics.close();
        }

        return false;
    }
}

module.exports = {
    Yildiz
};