"use strict";

const Redis = require("ioredis");
const debug = require("debug")("yildiz:redisclient");

class RedisClient {

  constructor(config) {

    this.config = config;
    this.redisConfig = this.config.redis;
    this.ttl = this.config.redis.ttl || 180;

    this.redis = null;
  }

  connect() {

    process.on('unhandledRejection', error => {
      // Will print "unhandledRejection err is not defined"
      console.log('unhandledRejection', error);
    });
    
    
    if (this.redisConfig.cluster) {
        this.redis = new Redis.Cluster(this.redisConfig.cluster.nodes, this.redisConfig.cluster.options);

      } else if (this.redisConfig.single) {
        this.redisConfig.single.retryStrategy = (times) => Math.min(times * 2000, 30000);
        this.redis = new Redis(this.redisConfig.single);

    } else {
        debug("No single or cluster redis config found.");
        return;
    }

    this.redis.on("error", error => {
        debug(`Redis error in user session cache: ${JSON.stringify(error)}`);
        RedisUserSessionCache.metrics.totalCacheErrors.inc();
    });

    this.redis.on("node error", error => {
        debug(`Redis node error in user session cache: ${JSON.stringify(error)}`);
        RedisUserSessionCache.metrics.totalCacheErrors.inc();
    });

    this.redis.on("connect", () => debug("Redis is connected."));

    this.redis.on("ready", () => debug("Redis is ready."));

    this.redis.on("close", () => debug("Redis connection is closed."));

    this.redis.on("reconnecting", () => debug("Redis is reconnecting..."));

    this.redis.on("end", () => debug("Redis connection has ended."));
  }
  
  async setExistence(data) {

    data = !Array.isArray(data) ? [data] : data;
    
    const setPromise = data.map(node => {
      const identifier = node.identifier || node.id;
      this.redis.set(`exist:${identifier}`, true, "EX", this.ttl);
    });

    return await Promise.all(setPromise);
  }

  async setRightNode(data) {

    data = !Array.isArray(data) ? [data] : data;

    const setPromise = data.map(node => {
      const identifier = node.identifier || node.id;
      this.redis.set(`rn:${identifier}`, JSON.stringify(node), "EX", this.ttl);
    });

    return await Promise.all(setPromise);
  }

  async mgetExistence(keys) {

    keys = !Array.isArray(keys) ? [keys] : keys;

    const redisKeys = keys.map(key => `exist:${key}`);

    return await this.redis.mget(redisKeys);
  }

  async mgetRightNode(keys) {

    keys = !Array.isArray(keys) ? [keys] : keys;

    const redisKeys = keys.map(key => `rn:${key}`);

    return await this.redis.mget(redisKeys);
  }

  async getSize() {
    return await this.redis.dbsize();
  }

  async close() {
    await this.redis.flushall();
  }

}

module.exports = RedisClient;