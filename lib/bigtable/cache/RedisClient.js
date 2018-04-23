"use strict";

const Redis = require("ioredis");
const debug = require("debug")("yildiz:redisclient");

const ECONNREFUSED = "ECONNREFUSED";

class RedisClient {

  constructor(config, metrics) {

    this.config = config;
    this.redisConfig = this.config.redis;
    this.ttl = this.config.redis.ttl || 180;
    this.metrics = metrics;

    this.redis = null;
    this.errorEconnrefused = null;
  }

  connect() {

    if (this.redisConfig.cluster) {  
      this.redis = new Redis.Cluster(this.redisConfig.cluster.nodes, 
        Object.assign({ showFriendlyErrorStack: true }, this.redisConfig.cluster.options)
      );

    } else if (this.redisConfig.single) {
      this.redisConfig.single.retryStrategy = (times) => Math.min(times * 2000, 30000);
      this.redis = new Redis(this.redisConfig.single);

    } else if (this.redisConfig.sentinels) {
      this.redis = new Redis(this.redisConfig);

    } else {
        debug("No single or cluster redis config found.");
        return;
    }

    this.redis.on("error", error => {
        debug(`Redis error: ${error}`);

        if (error.errno === ECONNREFUSED) {
          this.errorEconnrefused = error;
        }
        this.metrics.inc("redis_error");
    });

    this.redis.on("node error", error => {
        debug(`Redis node error: ${error}`);
        this.metrics.inc("redis_node_error");
    });

    this.redis.on("connect", () => debug("Redis is connected."));

    this.redis.on("ready", () => {
      this.errorEconnrefused = null;
      debug("Redis is ready.")
    });

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

    if (this.errorEconnrefused) {
      throw this.errorEconnrefused
    }

    return await Promise.all(setPromise);
  }

  async setRightNode(data) {

    data = !Array.isArray(data) ? [data] : data;

    const setPromise = data.map(node => {
      const identifier = node.identifier || node.id;
      this.redis.set(`rn:${identifier}`, JSON.stringify(node), "EX", this.ttl);
    });

    if (this.errorEconnrefused) {
      throw this.errorEconnrefused
    }

    return await Promise.all(setPromise);
  }

  async mgetExistence(keys) {

    keys = !Array.isArray(keys) ? [keys] : keys;
    const redisKeys = keys.map(key => `exist:${key}`);

    if (this.errorEconnrefused) {
      throw this.errorEconnrefused
    }

    return await this.redis.mget(redisKeys);
  }

  async mgetRightNode(keys) {

    keys = !Array.isArray(keys) ? [keys] : keys;
    const redisKeys = keys.map(key => `rn:${key}`);

    if (this.errorEconnrefused) {
      throw this.errorEconnrefused
    }

    return await this.redis.mget(redisKeys);
  }

  async getSize() {
    return await this.redis.dbsize();
  }

  async close() {

    try {
      this.redis.disconnect();
    } catch(error) {
      // Do nothing
    }
  }

}

module.exports = RedisClient;