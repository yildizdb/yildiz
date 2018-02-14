"use strict";

const Redis = require("ioredis");

class RedisClient {

  constructor(config) {

    this.config = config;
    this.redis = new Redis(this.config.redis);
    this.ttl = this.config.jobIntervalInSec || this.config.redis.ttl || 120;
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