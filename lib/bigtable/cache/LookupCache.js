"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:lookupcache");

const RedisClient = require("./RedisClient");

class LookupCache {
  
  constructor(options = {}, metrics) {

    this.options = options;
    this.metrics = metrics;
    this.redisClient = new RedisClient(options);

    this._init();
  }

  _init(){

    let { ttlInSec, sizeIntervalInSec } = this.options.lookupcache || {};

    sizeIntervalInSec = sizeIntervalInSec || 5;

    debug(`getting a dbsize job active running every ${sizeIntervalInSec} sec`);

    this._runJobSize(sizeIntervalInSec);
  }

  _runJobSize(sizeIntervalInSec) {

      this._tosv = setTimeout(() => {

        const startTime = Date.now();
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
    
    // The one that is null means they are not in cache
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

    await this.redisClient.setExistence(translatedNodes);
  }

  async setRightNode(rightNodes) {

    await this.redisClient.setRightNode(rightNodes);
  }

  async clear() {

    if (this._tosv) {

      clearTimeout(this._tosv);
    }

    await this.redisClient.close();
  }
}

module.exports = LookupCache;