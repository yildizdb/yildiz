"use strict";

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

      keys = await this._getKeysToBeCached();
      
      if(!keys || !keys.length){
        return this._runJob();
      }
      
      await this._batchFetch(keys);
    } catch(error){
      debug("error occurred when running job", error.message);
    }

    if (keys && (keys.length === this.limit)) {
      return await this._jobAction();
    }

    return this._runJob();
  }

  async _getKeysToBeCached() {

    const lastAccess = Date.now() - (this.fetchLastAccess * 1000);

    const removedCounts = await this.redisClient.clearLastAccess(this.expireInSec * 1000);

    if (removedCounts) {
      debug(`expired keys found from LA_SET, removed ${removedCounts} keys`);
    }

    const keys = await this.redisClient.getCacheRefresh(lastAccess, this.limit);

    if (!keys.length) {
      return keys;
    }

    const accessedKeys = await this.redisClient.getLastAccess(lastAccess, this.limit);

    if (!accessedKeys.length) {
      // Remove the keys from CACHEREFRESH_SET because if it is not in LASTACCESS_SET it means it is no longer valid
      debug(`expired keys found from CR_SET, removed ${keys.length} keys`);
      await this.redisClient.clearCacheRefresh(keys);
      return [];
    }

    // Get the intersection
    // If LA_SET not in CR_SET, add the keys to be cached
    const keysToBeCached = accessedKeys
      .filter(value => keys.indexOf(value) === -1)
      .concat(keys);

    await this.redisClient.setCacheRefresh(keysToBeCached);

    // If CR_SET not in LA_SET, remove the keys from CR_SET
    const keysToBeRemoved = keys
      .filter(value => accessedKeys.indexOf(value) === -1);

    // If it is not there, remove the keys from CACHEREFRESH_SET
    if (keysToBeRemoved.length) {
      debug(`expired keys found from CR_SET, removed ${keysToBeRemoved.length} keys`);
      await this.redisClient.clearCacheRefresh(keysToBeRemoved);
    }

    debug(`scanning keys, found ${keysToBeCached.length} keys to be cached`);

    // Otherwise cache the keys
    return keysToBeCached;
  }

  async _batchFetch(keys) {

    debug(`Job executed to cache ${keys.length} keys`);

    if(keys.length < this.fetchBatchSize) {
      return await this.graphAccess.setCacheLastAccess(keys);
    }

    const batchedKeys = this._arrayToChunks(keys, this.fetchBatchSize);

    for (const i = 0; i < batchedKeys.length; i++) {
      const batch = batchedKeys[i];
      await this.graphAccess.setCacheLastAccess(batch);
    }

  }

  async init(){
    this.graphAccess = await this.yildiz.getGraphAccess();

    debug("Running job to cache nodes");
    this._runJob();
  }

  async bumpTTL(key) {
    await this.redisClient.setLastAccess(key);
  }


  async close() {

    if (this._tov) {
      clearTimeout(this._tov);
    }
  }
}

module.exports = FetchJob;