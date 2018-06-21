"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:fetchjob");

class FetchJob {
  
  constructor(options = {}, yildiz, metrics, redisClient) {

    this.options = options;
    this.redisClient = redisClient;
    this.yildiz = yildiz;

    const {
      expireInSec,
      fetchIntervalInSec,
      fetchLastAccess,
      fetchBatchSize,
      limit
    } = this.options.fetchJob || {};

    // How long the keys are going to expire in redis
    this.expireInSec = expireInSec || 60 * 60 * 72; //72 hours

    // Fetch Interval for job
    this.fetchIntervalInSec = fetchIntervalInSec || 3;

    // How long the cache is stored until it should be fetched again
    this.fetchLastAccess = fetchLastAccess || 180;

    // Batch size for storing the cache
    this.fetchBatchSize = fetchBatchSize || 10;

    // Limit in retrieving the lastAccess nodeId from redis
    this.limit = limit || 20;
  }

  _arrayToChunks(array, size){

    const result = [];
    for (let i = 0; i < array.length; i += size) {
        const chunk = array.slice(i, i+size);
        result.push(chunk);
    }
    return result;
  }

  _runJob() {

    let keys = null;

    this._tov = setTimeout(async () => {

      try {
        await this._jobAction();
      } catch(error) {
        debug("error while running job", error);
        this._runJob();
      }

    }, this.fetchIntervalInSec * 1000);
  }

  async _jobAction() {

    let keys = null;

    try {

      keys = await this._scan();
      
      if(!keys || !keys.length){
        return this._runJob();
      }
      
      await this._batchFetch(keys);
    } catch(error){
      debug("error occurred when running job", error);
    }

    if (keys && (keys.length === this.limit)) {
      return await this._jobAction();
    }
  }

  async _scan() {

    const lastAccess = Date.now() - (this.fetchLastAccess * 1000);

    await this.redisClient.clearLastAccess(this.expireInSec);
    const keys = await this.redisClient.getLastAccess(lastAccess, this.limit);

    debug(`scanning lastAccess keys, found ${keys.length} keys`);

    return keys;
  }

  async _batchFetch(keys) {

    debug(`Job executed to cache ${keys.length} keys`);

    if(keys.length < this.fetchBatchSize) {
      await this.graphAccess.setCacheLastAccess(keys);
      return await this.redisClient.setLastAccess(keys);
    }

    const batchedKeys = this._arrayToChunks(keys, this.fetchBatchSize);

    for (const i = 0; i < keys.length; i++) {
      const batch = keys[i];
      await this.graphAccess.setCacheLastAccess(batch);
      await this.redisClient.setLastAccess(batch);
    }

  }

  async init(){
    this.graphAccess = await this.yildiz.getGraphAccess();

    debug("Running job to cache nodes");
    this._runJob();
  }

  async bumpTTL(key) {
    debug(`Bumping ${key}`);
    this.redisClient.setLastAccess(key);
  }


  async close() {

    if (this._tosv) {
      clearTimeout(this._tosv);
    }
  }
}

module.exports = FetchJob;