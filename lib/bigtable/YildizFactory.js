"use strict";

const Promise = require("bluebird");
const cache = require("memory-cache");
const PromRegistry = require('prom-client').Registry;
const debug = require("debug")("yildiz:factory");

const {Yildiz} = require("./Yildiz.js");
const Metrics = require("./metrics/Metrics.js");

const CACHE_TIME_MS = 60 * 1000; //1 minute
const REFRESH_DIFF_MS = CACHE_TIME_MS * 0.9; //almost 1 minute
const FACTORY_METRICS_PREFIX = "__FACTORY__";

class YildizFactory {

    constructor(config = {}) {
        this._baseConfig = config;
        this._cache = new cache.Cache();

        this._blocked = {};
        this._updated = {};
        this._metricsRegisters = {};

        this.metrics = new Metrics(FACTORY_METRICS_PREFIX);
        this._metricsRegisters[FACTORY_METRICS_PREFIX] = this.metrics.getRegister();
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

        // TODO: Delete at some point if the keys are too many        
        this._metricsRegisters[prefix] = instance.metrics.getRegister();
        return instance;
    }

    getAllMetricsRegisters() {
        // Return empty array if the registers is not initialized
        if (!Object.keys(this._metricsRegisters).length) {
            return [];
        }
        
        const array = [];

        Object.keys(this._metricsRegisters).forEach(prefix => {
            array.push(this._metricsRegisters[prefix]);
        });

        return PromRegistry.merge(array);
    }

    async closeAll() {

        await Promise.all(this._cache.keys()
            .map(key => this._cache.get(key))
            .map(instance => instance.close()));

        this.metrics.close();

        this._metricsRegisters = {};
        this._cache.clear();
    }
}

module.exports = {
    YildizFactory
};