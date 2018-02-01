"use strict";

const Promise = require("bluebird");
const Debug = require("debug");
const debug = Debug("yildiz:main");
const Bigtable = require("@google-cloud/bigtable");

const Metadata = require("./graph/Metadata.js");
const NodeHandler = require("./graph/NodeHandler.js");
const NodeHandlerSingle = require("./graph/NodeHandlerSingle.js");

const Cache = require("./graph/Cache.js");
const Translator = require("./graph/Translator.js");
const TranslatorSingle = require("./graph/TranslatorSingle.js");
const GraphAccess = require("./graph/GraphAccess.js");
const GraphAccessSingle = require("./graph/GraphAccessSingle.js");

const Lifetime = require("./db/Lifetime.js");

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
        this.metadata = new Metadata(this);

        this.stats = {};
        this.exstats = {};
        this.gaugeStats = {};
        
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

    getTranslator(){
        //promisified because of future api relations
        this._incStat("translates");
        return new Promise(resolve => {

            const {singleTableMode} = this.config.database;

            if (singleTableMode){
                return resolve(new TranslatorSingle(this));
            }

            resolve(new Translator(this));
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

        const stats = {
            internCalls: this.stats,
            externCalls: this.exstats,
            cache: await this.cache.getStats(),
            gauges: this.gaugeStats
        };

        if(this.ttlJob){
            stats.ttl = this.ttlJob.getStats();
        }
        
        return stats;
    }

    async init(/* no options used anymore */){

        let {
            clusters,
            projectId,
            keyFilename,
            nodeHandler
        } = this.config.database;

        clusters = clusters || [];

        debug("init:", clusters, ". project:", projectId);

        this.bigtable = new Bigtable({ 
            projectId,
            keyFilename
        });

        debug(projectId);

        debug("auth test was successfull.");

        await this._generate();
        debug("tables/families generated.");

        if (this.instance) {
            await this.metadata.generateTableAndCF(this.instance);
        }
        debug("sync done, ready to do work.");

        debug("starting jobs");
        this._runJobs();
    }

    _incStat(key){
        //int
        if(!this.stats[key]){
            this.stats[key] = 1;
        } else {
            this.stats[key] += 1;
        }
    }

    incStat(key, val = 1){
        //ext
        if(!this.exstats[key]){
            this.exstats[key] = val;
        } else {
            this.exstats[key] += val;
        }
    }

    setGaugeStat(key, val = 1){
        this.gaugeStats[key] = val;
    }

    async _generate(){

        const start = Date.now();

        let {
            instanceName,
            columnFamilyName,
            singleTableMode
        } = this.config.database;

        this.instance = this.bigtable.instance(instanceName);
        const instanceExists = await this.instance.exists();
        if (!instanceExists || !instanceExists[0]) {
            await this.instance.create();
        }

        // GENERATE tables
        
        const nodeTableName = `${this.prefix}_nodes`;
        this.nodeTable = this.instance.table(nodeTableName);
        const nodeTableExists = await this.nodeTable.exists();
        if (!nodeTableExists || !nodeTableExists[0]) {
            await this.nodeTable.create(nodeTableName);
        }
        
        const ttlTableName = `${this.prefix}_ttl`;
        this.ttlTable = this.instance.table(ttlTableName);
        const ttlTableExists = await this.ttlTable.exists();
        if (!ttlTableExists || !ttlTableExists[0]) {
            await this.ttlTable.create(ttlTableName);
        }

        this.columnFamilyNode = this.nodeTable.family("nodes");
        const columnFamilyNodeExists = await this.columnFamilyNode.exists();
        if (!columnFamilyNodeExists || !columnFamilyNodeExists[0]) {
            await this.columnFamilyNode.create("nodes");
        }
        
        this.columnFamilyTTL = this.ttlTable.family("ttl");
        const columnFamilyTTLExists = await this.columnFamilyTTL.exists();
        if (!columnFamilyTTLExists || !columnFamilyTTLExists[0]) {
            await this.columnFamilyTTL.create("ttl");
        }
        
        // GENERATE columnFamilies
        
        if (!singleTableMode) {

            const edgeTableName = `${this.prefix}_edges`;
            this.edgeTable = this.instance.table(edgeTableName);
            const edgeTableExists = await this.edgeTable.exists();
            if (!edgeTableExists || !edgeTableExists[0]) {
                await this.edgeTable.create(edgeTableName);
            }
            
            const translateTableName = `${this.prefix}_translates`;
            this.translateTable = this.instance.table(translateTableName);
            const translateTableExists = await this.translateTable.exists();
            if (!translateTableExists || !translateTableExists[0]) {
                await this.translateTable.create(translateTableName);
            }

            this.columnFamilyEdge = this.edgeTable.family("edges");
            const columnFamilyEdgeExists = await this.columnFamilyEdge.exists();
            if (!columnFamilyEdgeExists || !columnFamilyEdgeExists[0]) {
                await this.columnFamilyEdge.create("edges");
            }
            
            this.columnFamilyTranslate = this.translateTable.family("translates");
            const columnFamilyTranslateExists = await this.columnFamilyTranslate.exists();
            if (!columnFamilyTranslateExists || !columnFamilyTranslateExists[0]) {
                await this.columnFamilyTranslate.create("translates");
            }
        }
        

        const diff = Date.now() - start;
        debug(`Generate table and columnFamily done, took ${diff} ms`);
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