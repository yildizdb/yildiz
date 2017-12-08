"use strict";

const Promise = require("bluebird");
const cache = require("memory-cache");
const debug = require("debug")("yildiz:factory");

const {
    Yildiz
} = require("./Yildiz.js");

const CACHE_TIME_MS = 60 * 1000; //1 minute
const REFRESH_DIFF_MS = CACHE_TIME_MS * 0.9; //almost 1 minute

class YildizFactory {

    constructor(config = {}) {
        this._baseConfig = config;
        this._cache = new cache.Cache();

        this._blocked = {};
        this._updated = {};

        let {
            host,
            port,
            database,
            username,
            dialect
        } = this._baseConfig.database || {};

        dialect = dialect || "mysql";
        host = host || "localhost";
        port = port || 3306;
        database = database || "yildiz";
        username = username || "root";

        //check config's access field
        if(!config.access){
            debug("access is not configured, every prefix is allowed.");
            config.access = "*";
        } else if(typeof config.access === "string"){
            if(config.access === "*"){
                debug("access is opened to any prefix.");
            } else {
                throw new Error("access is configured to " + config.access 
                    + " which is not supported, defaulting to * - allowing any prefix.");
            }
        } else if(typeof config.access === "object"){

            Object.keys(config.access).forEach(key => {

                if(typeof key !== "string"){
                    debug("access keys must be a string, as they represent the prefix", key, "is not, which is why it was removed.");
                    delete config.access[key];
                    return;
                }

                if((!Array.isArray(config.access[key]) && typeof config.access[key] !== "string") || !config.access[key]){
                    debug("access values must be token arrays or wildcards(*), removing", key);
                    delete config.access[key];
                }
            });

            if(config["*"]){

                if(!Array.isArray(config["*"])){
                    throw new Error("When access key '*' is defined, it must be an array.");
                }

                debug("key * is configured, meaning a few tokens will be able to create any prefix.");
            } else {
                debug("access is allowed for these prefixes only:", Object.keys(config.access).join(", "));
            }
        }

        this.access = config.access;

        if(this.access !== "*" && typeof this.access !== "object"){
            throw new Error("bad access configuration passed: " + this.access);
        }

        debug(`spawn config: ${dialect}://${host}:${port}/${database} as ${username}.`);
    }

    isPrefixWithTokenAllowed(prefix, token){

        //-1 prefix not allowed
        //0 noth authorized
        //1 good to go

        if(this.access === "*"){
            return 1;
        }

        if(this.access[prefix]){

            if(Array.isArray(this.access[prefix])){

                //find token or forbid
                for(let i = 0; i < this.access[prefix].length; i++){
                    if(this.access[prefix][i] === token){
                        return 1;
                    }
                }

                return 0;
            } else {
                //should be string = *
                return 1;
            }
        }

        if(this.access["*"]){

            //find token or forbid
            for(let i = 0; i < this.access["*"].length; i++){
                if(this.access["*"][i] === token){
                    return 1;
                }
            }

            return 0;
        }

        return -1;
    }

    async getStats(){
        return await Promise.all(this._cache.keys().map(async prefix => ({
                prefix,
                stats: await this._cache.get(prefix).getStats()
            }))).reduce((val, current) => {
            const {prefix, stats} = current;
            val[prefix] = stats;
            return val;
        }, {});
    }

    _storeInstance(prefix, instance) {

        this._cache.put(prefix, instance, CACHE_TIME_MS, () => {
            try {
                debug(`factory instance timeout reached for ${prefix}, closing and removing from cache.`);
                delete this._updated[prefix];
                instance.close();
            } catch (error) {
                debug("cache ran out, closing error", error);
            }
        });

        this._updated[prefix] = Date.now();
    }

    _prolongCachetime(prefix, instance) {

        if (!this._updated[prefix]) {
            return;
        }

        const diff = Date.now() - this._updated[prefix];
        if (diff < REFRESH_DIFF_MS) {
            return;
        }

        //reset key with new timeout
        this._storeInstance(prefix, instance);
    }

    async get(prefix = "kc0", options = {}, force = false) {

        //instance wasnt present in cache, but there is already a process
        //that creates a new instance, resolve to same promise
        if (this._blocked[prefix]) {
            return await this._blocked[prefix];
        }

        //instance is present, check if we need to pro-long cache
        //and resolve with instance
        let instance = this._cache.get(prefix);
        if (instance) {
            this._prolongCachetime(prefix, instance);
            return instance;
        }

        //instance is not present, create blocking promise for future requests during init
        //init, set cache and clean-up afterwards
        this._blocked[prefix] = new Promise((resolve, reject) => {
            const newInstance = new Yildiz(prefix, Object.assign({}, this._baseConfig));
            newInstance.init(options, force).then(() => {
                this._storeInstance(prefix, newInstance);
                resolve(newInstance);
            }).catch(reject);
        });

        instance = await this._blocked[prefix];
        delete this._blocked[prefix]; //clean-up
        return instance;
    }

    async closeAll() {

        await Promise.all(this._cache.keys()
            .map(key => this._cache.get(key))
            .map(instance => instance.close()));

        this._cache.clear();
    }
}

module.exports = {
    YildizFactory
};