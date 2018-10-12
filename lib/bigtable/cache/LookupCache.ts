import Debug from "debug";

import { ServiceConfig } from "../../interfaces/ServiceConfig";
import { Metrics } from "../metrics/Metrics";
import { RedisClient } from "./RedisClient";
import { YildizSingleSchema } from "../../interfaces/Yildiz";

const debug = Debug("yildiz:lookupcache");

export class LookupCache {

  private config: ServiceConfig;
  private metrics: Metrics;
  private redisClient: RedisClient;
  private tosv!: NodeJS.Timer | number;

  constructor(config: ServiceConfig, metrics: Metrics, redisClient: RedisClient) {

    this.config = config;
    this.metrics = metrics;
    this.redisClient = redisClient;
    this.init();
  }

  public init() {

    const { sizeIntervalInSec = 5 } = this.config.lookupCache || {};

    debug(`getting a dbsize job active running every ${sizeIntervalInSec} sec`);
    this.runJobSize(sizeIntervalInSec);
  }

  private runJobSize(sizeIntervalInSec: number) {

      this.tosv = setTimeout(() => {

        this.getSize().then((size: number) => {
          this.metrics.set("redis_dbsize", size);
          this.runJobSize(sizeIntervalInSec);
        }).catch((error: Error) => {
          debug("getting size job failed.", error);
          this.runJobSize(sizeIntervalInSec);
        });

      }, sizeIntervalInSec * 1000);
  }

  private async getSize() {
    return await this.redisClient.getSize();
  }

  public async classifyExistence(keys: string[]) {
    const start = Date.now();
    let mExistence: any;

    try {
      mExistence = await this.redisClient.mgetExistence(keys);
    } catch (error) {
      throw error;
    }

    const cacheKeys: string[] = [];
    const nocacheKeys: string[] = [];

    if (!mExistence) {
      return {
        cache: cacheKeys,
        nocache: keys,
      };
    }

    // if they are null, it means they are not cached
    keys.map((key: string, index) => {

      if (mExistence[index]) {
        cacheKeys.push(key);
      } else {
        nocacheKeys.push(key);
      }
    });

    this.metrics.inc("redis_existence_rate", keys.length);
    this.metrics.set("lookup_classifyExistence", (Date.now() - start));

    return {
      cache: cacheKeys,
      nocache: nocacheKeys,
    };
  }

  public async classifyRightNode(keys: string[]) {

    const start = Date.now();
    let mRightNode: any;

    try {
      mRightNode = await this.redisClient.mgetRightNode(keys);
    } catch (error) {
      throw error;
    }

    const cacheNodes: YildizSingleSchema[] = [];
    const nocacheKeys: string[] = [];

    if (!mRightNode) {
      return {
        cache: cacheNodes,
        nocache: keys,
      };
    }

    // cache will contain an array of object data of resolved right node
    // nocache will contain an array of key of unresolved right node
    keys.map((key, index) => {

      if (mRightNode[index]) {
        cacheNodes.push(JSON.parse(mRightNode[index]));
      } else {
        nocacheKeys.push(key);
      }
    });

    this.metrics.inc("redis_rightnode_rate", keys.length);
    this.metrics.set("lookup_classifyRightNode", (Date.now() - start));

    return {
      cache: cacheNodes,
      nocache: nocacheKeys,
    };
  }

  public async setExistence(translatedNodes: YildizSingleSchema | YildizSingleSchema[]) {
    try {
      await this.redisClient.setExistence(translatedNodes);
    } catch (error) {
      debug(error);
    }
  }

  public async setRightNode(rightNodes: YildizSingleSchema | YildizSingleSchema[]) {
    try {
      await this.redisClient.setRightNode(rightNodes);
    } catch (error) {
      debug(error);
    }
  }

  public close() {
    if (this.tosv) {
      clearTimeout(this.tosv as NodeJS.Timer);
    }
  }
}
