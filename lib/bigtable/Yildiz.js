"use strict";

const Promise = require("bluebird");
const Debug = require("debug");
const debug = Debug("yildiz:main");
const Bigtable = require("@google-cloud/bigtable");

const NodeHandler = require("./graph/NodeHandler.js");

const Cache = require("./graph/Cache.js");
const Translator = require("./graph/Translator.js");
const GraphAccess = require("./graph/GraphAccess.js");

const Lifetime = require("./db/Lifetime.js");
const Metadata = require("./db/Metadata.js");

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
        this.cache = new Cache(this.config.cache);

        this.metadata = null;
        this.ttlJob = null;
    }

    getNodeHandler(){
        //promisified because of future api relations
        this._incStat("nodes");
        return new Promise(resolve => {

            const {singleTableMode} = this.config.database;

            if (singleTableMode){
                return resolve(new NodeHandlerSingle(this));
            }

            resolve(new NodeHandler(this));
        });
    }

    getGraphAccess(){
        this._incStat("graphs");
        return new Promise((resolve, reject) => {
            
            const {singleTableMode} = this.config.database;
            const access = singleTableMode ? new GraphAccessSingle(this) : new GraphAccess(this);

            access.init().then(() => {
                resolve(access);
            }).catch(error => {
                reject(error);
            });
        });
    }

    async getStats(){
        return {};
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

        debug("starting jobs");
        this._runJobs();
    }

    async _generate(){

        const start = Date.now();

        let {
            instanceName,
            columnFamilyName,
            singleTableMode
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

        const metadataTableName = `${this.yildiz.prefix}_metadata`;
        const metadataTable = instance.table(metadataTableName);
        const metadataTableExists = await metadataTable.exists();
        if (!metadataTableExists || !metadataTableExists[0]) {
            await metadataTable.create(metadataTableName);
        }

        // GENERATE columnFamilies

        const columnFamilyNode = nodeTable.family("nodes");
        const columnFamilyNodeExists = await columnFamilyNode.exists();
        if (!columnFamilyNodeExists || !columnFamilyNodeExists[0]) {
            await columnFamilyNode.create("nodes");
        }
        
        const columnFamilyTTL = ttlTable.family("ttl");
        const columnFamilyTTLExists = await columnFamilyTTL.exists();
        if (!columnFamilyTTLExists || !columnFamilyTTLExists[0]) {
            await columnFamilyTTL.create("ttl");
        }
        
        const columnFamilyMetadata = metadataTable.family("metadata");
        const columnFamilyMetadataExists = await columnFamilyMetadata.exists();
        if (!columnFamilyMetadataExists || !columnFamilyMetadataExists[0]) {
            await columnFamilyMetadata.create("metadata");
        }

        debug(`Generate table and columnFamily done, took ${(Date.now() - start)} ms`);

        return {

            instance,

            nodeTable,
            ttlTable,
            metadataTable,

            columnFamilyNode,
            columnFamilyTTL,
            columnFamilyMetadata
        };
    }

    _runJobs(){

        if(this.config.ttl && typeof this.config.ttl === "object"){
            this.ttlJob = new Lifetime(this, this.config.ttl);
        } else {
            debug("ttl job configuration missing.");
        }
    }

    async close(){

        if(this.ttlJob){
            this.ttlJob.close();
        }

        if(this.cache){
            this.cache.clear();
        }

        if(this.metadata) {
            this.metadata.close();
        }

        return false;
    }
}

module.exports = {
    Yildiz
};