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

        this.stats = {};
        this.exstats = {};
        this.gaugeStats = {};
        
        this.ttlJob = null;
    }

    getNodeHandler(){
        //promisified because of future api relations
        this._incStat("nodes");
        return new Promise(resolve => {
            resolve(new NodeHandler(this));
        });
    }

    getTranslator(){
        //promisified because of future api relations
        this._incStat("translates");
        return new Promise(resolve => {
            resolve(new Translator(this));
        });
    }

    getGraphAccess(){
        this._incStat("graphs");
        return new Promise((resolve, reject) => {
            const access = new GraphAccess(this);
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
            clusters
        } = this.config.database;

        clusters = clusters || [];

        //debug("init", database, "as", username, "type", dialect);
        //TODO create bigtable instance
        this.bigtable = new Bigtable({/* TODO */});

        //TODO auth test for bigtable?
        debug("auth test was successfull.");

        this.models = await this._generate();
        debug("tables/families generated.");

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

    _generate(/* additional fields dont work in bigtable */){
        return new Promise((resolve, reject) => {
            
            resolve({
                //TODO do we resolve this anymore?
                //we have to check if tables exist or create them in bigtable
                //before resolving this
            });
        });
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

        //TODO close bigtable

        return false;
    }
}

module.exports = {
    Yildiz
};