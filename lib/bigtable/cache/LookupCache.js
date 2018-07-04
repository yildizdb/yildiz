"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:lookupcache");

const { getRedisClient } = require("./RedisClientFactory");

class LookupCache {
  
  constructor(options = {}, metrics) {

    this.options = options;
    this.metrics = metrics;
    this.redisClient = getRedisClient(options, metrics);
    this._init();
  }
  
  _init(){
    
    let { sizeIntervalInSec } = this.options.lookupcache || {};
    
    sizeIntervalInSec = sizeIntervalInSec || 5;
    
    debug(`getting a dbsize job active running every ${sizeIntervalInSec} sec`);
    
    this.redisClient.connect();
    this._runJobSize(sizeIntervalInSec);  
  }

  _runJobSize(sizeIntervalInSec) {

      this._tosv = setTimeout(() => {

        this._getSize().then(size => {
          this.metrics.set("redis_dbsize", size);
          this._runJobSize(sizeIntervalInSec);
        }).catch(error => {
          debug("getting size job failed.", error);
          this._runJobSize(sizeIntervalInSec);
        });

      }, sizeIntervalInSec * 1000);
  }

  async _getSize() {

    return await this.redisClient.getSize();
  }
  
  async classifyExistence(keys) {
    
    const start = Date.now();
    const mexistence = await this.redisClient.mgetExistence(keys);
    const cache = [];
    const nocache = [];
    
    // if they are null, it means they are not cached
    keys.map((key, index) => {
      
      if (mexistence[index]) {
        cache.push(key);
      } else {
        nocache.push(key);
      }
    });
    
    this.metrics.inc("redis_existence_rate", keys.length);
    this.metrics.set("lookup_classifyExistence", (Date.now() - start));

    return {
      cache,
      nocache
    }
  }

  async classifyRightNode(keys) {

    const start = Date.now();
    const mRightNode = await this.redisClient.mgetRightNode(keys);

    const cache = [];
    const nocache = [];

    // cache will contain an array of object data of resolved right node
    // nocache will contain an array of key of unresolved right node
    keys.map((key, index) => {
      
      if (mRightNode[index]) {
        cache.push(JSON.parse(mRightNode[index]));
      } else {
        nocache.push(key);
      }
    });
    
    this.metrics.inc("redis_rightnode_rate", keys.length);
    this.metrics.set("lookup_classifyRightNode", (Date.now() - start));

    return {
      cache,
      nocache
    }
  }

  async setExistence(translatedNodes) {
    try {
      await this.redisClient.setExistence(translatedNodes);
    } catch(error) {
      debug(error);
    }
  }

  async setRightNode(rightNodes) {
    try {
      await this.redisClient.setRightNode(rightNodes);
    } catch(error) {
      debug(error);
    }
  }

  async close() {

    if (this._tosv) {
      clearTimeout(this._tosv);
    }

    this.redisClient.close();
  }
}

module.exports = LookupCache;