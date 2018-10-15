import IORedis, { Redis } from "ioredis";
import Debug from "debug";
import Bluebird from "bluebird";

import { Metrics } from "../metrics/Metrics";
import { ServiceConfig, RedisConfig } from "../../interfaces/ServiceConfig";
import { YildizSingleSchema } from "../../interfaces/Yildiz";

const debug = Debug("yildiz:redisclient");

const NOT_CONNECTED = "Redis is not connected";
const EXIST_KEY = "exist";
const RIGHTNODE_KEY = "rn";
const CACHEREFRESH_SET = "cr_set";
const LASTACCESS_SET = "la_set";
const TTL_SET = "ttl_set";

export class RedisClient {

  private config: ServiceConfig;
  private redisConfig: RedisConfig;
  private ttl: number;
  private metrics: Metrics;
  private redis!: Redis;
  private timeoutReadyInMs: number;
  private prefix: string;

  constructor(config: ServiceConfig, metrics: Metrics, prefix: string) {

    this.config = config;
    this.redisConfig = this.config.redis;
    this.ttl = this.config.redis.ttl || 180;
    this.timeoutReadyInMs = (this.config.redis.timeoutReady || 1) * 1000;
    this.metrics = metrics;
    this.prefix = prefix;
  }

  public connect() {

    if (this.redisConfig.cluster) {

      this.redis = new IORedis.Cluster(this.redisConfig.cluster.nodes,
        Object.assign({ showFriendlyErrorStack: true }, this.redisConfig.cluster.config),
      );

    } else if (this.redisConfig.single) {
      this.redisConfig.single.retryStrategy = (times: number) => Math.min(times * 2000, 30000);
      this.redis = new IORedis(this.redisConfig.single);

    } else if (this.redisConfig.sentinels) {
      this.redis = new IORedis(this.redisConfig);

    } else {
        debug("No single or cluster redis config found.");
        return;
    }

    this.redis.on("node error", (error: Error) => {
        debug(`Redis node error: ${error}`);
        this.metrics.inc("redis_node_error");
    });

    this.redis.on("connect", () => debug("Redis is connected."));

    this.redis.on("close", () => debug("Redis connection is closed."));

    this.redis.on("reconnecting", () => debug("Redis is reconnecting..."));

    this.redis.on("end", () => debug("Redis connection has ended."));

    this.redis.on("error", (error: Error) => {
      debug(`Redis error: ${error}`);
      this.metrics.inc("redis_error");
    });

    // This Promise rejects on timeout
    return new Bluebird((resolve, reject) => {

      let isResolvedOrRejected = false;

      const promiseTimeout = setTimeout(() => {

        if (!isResolvedOrRejected) {
          isResolvedOrRejected = true;
          reject(new Error("Error connecting to Redis"));
        }

      }, this.timeoutReadyInMs);

      this.redis.once("ready", () => {

        debug("Redis is ready.");

        if (!isResolvedOrRejected) {
          isResolvedOrRejected = true;
          clearTimeout(promiseTimeout);
          resolve();
        }

      });

    });

  }

  public setLastAccess(keys: string | string[]) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    keys = !Array.isArray(keys) ? [keys] : keys;

    const timestamp = Date.now();

    const params: Array<[number, string]> = [];

    keys.map((key: string) => {
      params.push([timestamp, key]);
    });

    return this.redis.zadd(`${this.prefix}:${LASTACCESS_SET}`, ...params);
  }

  public setCacheRefresh(keys: string | string[]) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    keys = !Array.isArray(keys) ? [keys] : keys;

    const timestamp = Date.now();

    const params: Array<[number, string]> = [];

    keys.map((key: string) => {
      params.push([timestamp, key]);
    });

    return this.redis.zadd(`${this.prefix}:${CACHEREFRESH_SET}`, ...params);
  }

  public setExistence(identifiers: string | string[]) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    identifiers = !Array.isArray(identifiers) ? [identifiers] : identifiers;

    (identifiers as string[]).map((identifier: string) => {
      this.redis.set(`${this.prefix}:${EXIST_KEY}:${identifier}`, true, "EX", this.ttl);
    });
  }

  public setRightNode(data: YildizSingleSchema | YildizSingleSchema[]) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    data = !Array.isArray(data) ? [data] : data;

    (data as YildizSingleSchema[]).map((node: YildizSingleSchema) => {
      const identifier = node.identifier || node.id;
      this.redis.set(`${this.prefix}:${RIGHTNODE_KEY}:${identifier}`, JSON.stringify(node), "EX", this.ttl);
    });
  }

  public getLastAccess(lastAccess: number, limit: number) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    return this.redis
      .zrangebyscore(`${this.prefix}:${LASTACCESS_SET}`, 0, lastAccess, "LIMIT", 0, limit);
  }

  public async getCacheRefresh(lastRefresh: number, limit: number) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    const count  = await this.redis.zcount(`${this.prefix}:${CACHEREFRESH_SET}`, "-inf", "+inf");

    if (count === 0) {
      return this.redis
        .zrangebyscore(`${this.prefix}:${LASTACCESS_SET}`, 0, lastRefresh, "LIMIT", 0, limit);
    }

    return this.redis
      .zrangebyscore(`${this.prefix}:${CACHEREFRESH_SET}`, 0, lastRefresh, "LIMIT", 0, limit);
  }

  public async mgetExistence(keys: string | string[]) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    keys = !Array.isArray(keys) ? [keys] : keys;
    const redisKeys = keys.map((key: string) => `${this.prefix}:${EXIST_KEY}:${key}`);

    return await this.redis.mget(...redisKeys);
  }

  public async mgetRightNode(keys: string | string[]) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    keys = !Array.isArray(keys) ? [keys] : keys;
    const redisKeys = keys.map((key: string) => `${this.prefix}:${RIGHTNODE_KEY}:${key}`);

    return await this.redis.mget(...redisKeys);
  }

  public async getSize() {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    return await this.redis.dbsize();
  }

  public clearLastAccess(expire: number) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    return this.redis.zremrangebyscore(`${this.prefix}:${LASTACCESS_SET}`, 0, Date.now() - expire);
  }

  public clearCacheRefresh(members: string | string[]) {

    if (this.redis.status !== "ready") {
      throw new Error(NOT_CONNECTED);
    }

    members = !Array.isArray(members) ? [members] : members;

    return this.redis.zrem(`${this.prefix}:${CACHEREFRESH_SET}`, ...members);
  }

  public async close() {

    try {
      await this.redis.disconnect();
    } catch (error) {
      // Do nothing
    }
  }

}
