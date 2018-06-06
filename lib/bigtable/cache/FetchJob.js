"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:fetchjob");

const redisClient = require("./redisClient");

class FetchJob {
  
  constructor(options = {}, yildiz, metrics) {

    this.options = options;
    this.redisClient = redisClient.create(options, metrics);
    this.yildiz = yildiz;

    // How long the keys are going to expire in redis
    this.expireInSec = (this.options.fetchJob || {}).expireInSec || 60 * 60 * 72; //72 hours

    // Fetch Interval for job
    this.fetchIntervalInSec = (this.options.fetchJob || {}).fetchIntervalInSec || 3;

    // How long the cache is stored until it should be fetched again
    this.fetchLastAccess = (this.options.fetchJob || {}).fetchLastAccess || 180;

    // Batch size for storing the cache
    this.fetchBatchSize = (this.options.fetchJob || {}).fetchBatchSize || 10;

    // Limit in retrieving the lastAccess nodeId from redis
    this.limit = (this.options.fetchJob || {}).limit || 20;

    this._init();
  }

  _chunk(arr, size){

    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        const chunk = arr.slice(i, i+size);
        result.push(chunk);
    }
    return result;
  }

  async _init(){
    this.graphAccess = await this.yildiz.getGraphAccess();

    debug("Running job to cache nodes");
    this._runJob(this.fetchIntervalInSec);
  }

  async _runJob(intervalInSec) {

    let keys = null;
    const intervalInMs = intervalInSec * 1000;

    this._tov = setTimeout(() => {
      this._jobAction(intervalInSec);
    }, intervalInSec * 1000);
  }

  _jobAction(intervalInSec) {

    this._scan().then(keys => {

      if (keys && keys.length) {

        try {
          this._batchFetch(keys);
        } catch (error) {
          debug("error while fetching", error);
        }

        if (keys.length === this.limit) {
          this._jobAction();
          return;
        }
      }

      this._runJob(intervalInSec);

    }).catch(error => {

      debug("getting lastAccess failed.", error);
      this._runJob(intervalInSec);
    });
  }

  async _scan() {

    const lastAccess = Date.now() - (this.fetchLastAccess * 1000);
    const keys = await this.redisClient.getLastAccess(lastAccess, this.limit);
    await this.redisClient.clearLastAccess(this.expireInSec);

    debug("scanning lastAccess keys, found", keys);

    return keys;
  }

  async _batchFetch(keys) {

    if (keys.length) {
      debug(`Job executed to cache ${keys.length} keys`);
    }

    if(keys.length < this.fetchBatchSize) {
      await this.graphAccess.setCacheLastAccess(keys);
      await this.redisClient.setLastAccess(keys);
      return;
    }

    const batchedKeys = this._chunk(keys, this.fetchBatchSize);

    for (const i = 0; i < keys.length; i++) {
      const batch = keys[i];
      await this.graphAccess.setCacheLastAccess(batch);
      await this.redisClient.setLastAccess(batch);
    }

  }

  async bumpTTL(key) {
    debug(`Bumping ${key}`);
    await this.redisClient.setLastAccess(key);
  }


  async close() {

    if (this._tosv) {
      clearTimeout(this._tosv);
    }
  }
}

module.exports = FetchJob;