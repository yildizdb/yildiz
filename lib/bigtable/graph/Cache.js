"use strict";

const cache = require("memory-cache");

const DEFAULT_NODE_CACHE_TIME = 32000;
const DEFAULT_EDGE_CACHE_TIME = 48000;

class Cache {

    constructor(config = {}){

        this.cache = new cache.Cache();

        this._nodeHits = 0;
        this._nodeMiss = 0;
        this._nodeSet = 0;

        this._edgeHits = 0;
        this._edgeMiss = 0;
        this._edgeSet = 0;

        this._dels = 0;
        this._clears = 0;

        this.NODE_CACHE_TIME = config.nodeCacheTime || DEFAULT_NODE_CACHE_TIME;
        this.EDGE_CACHE_TIME = config.edgeCacheTime || DEFAULT_EDGE_CACHE_TIME;
    }

    async getNode(key){
        //async to make it easier to replace with async client in the future
        const val = this.cache.get(key);

        if(val){
            //extend key on cache hit
            this._nodeHits++;
            await this.setNode(key, val);
        } else {
            this._nodeMiss++;
        }
        
        return val;
    }

    async getEdge(key){
        //async to make it easier to replace with async client in the future
        const val = this.cache.get(key);

        if(val){
            //extend key on cache hit
            this._edgeHits++;
            await this.setEdge(key, val);
        } else {
            this._edgeMiss++;
        }

        return val;
    }

    async setNode(key, val){
        //async to make it easier to replace with async client in the future
        this._nodeSet++;
        return this.cache.put(key, val, this.NODE_CACHE_TIME);
    }

    async setEdge(key, val){
        //async to make it easier to replace with async client in the future
        this._edgeSet++;
        return this.cache.put(key, val, this.EDGE_CACHE_TIME);
    }

    async del(key){
        //async to make it easier to replace with async client in the future
        this._dels++;
        return this.cache.del(key);
    }

    async clear(){
        //async to make it easier to replace with async client in the future
        this._clears++;
        return this.cache.clear();
    }

    async getStats() {
        //async to make it easier to replace with async client in the future
        return {
            nodes: {
                hit: this._nodeHits,
                miss: this._nodeMiss,
                set: this._nodeSet
            },
            edges: {
                hit: this._edgeHits,
                miss: this._edgeMiss,
                set: this._edgeSet
            },
            size: this.cache.size(),
            deletes: this._dels,
            clears: this._clears
        };
    }

    async getKeys(){
        return this.cache.keys();
    }
}

module.exports = Cache;
