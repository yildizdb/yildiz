"use strict";

const Promise = require("bluebird");
const cache = require("memory-cache");
const debug = require("debug")("krakn:factory");

const {
    Krakn
} = require("./Krakn.js");

const CACHE_TIME_MS = 60 * 1000; //1 minute
const REFRESH_DIFF_MS = CACHE_TIME_MS * 0.9; //almost 1 minute

class KraknFactory {

    constructor(config = {}) {
        this._baseConfig = config;
        this._cache = new cache.Cache();

        this._blocked = {};
        this._updated = {};
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
            const newInstance = new Krakn(prefix, Object.assign({}, this._baseConfig));
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
    KraknFactory
};