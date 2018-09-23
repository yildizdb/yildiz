import Debug from "debug";

import { ServiceConfig } from "../../interfaces/ServiceConfig";
import { Yildiz } from "../Yildiz";
import { Metrics } from "../metrics/Metrics";
import { RedisClient } from "./RedisClient";
import { GraphAccess } from "../graph/GraphAccess";

const debug = Debug("yildiz:fetchjob");

const DEFAULT_EXP_IN_SEC = 60 * 60 * 72; // 72 hours
const DEFAULT_FETCH_INTERV_IN_SEC = 3;
const DEFAULT_FETCH_LAST_ACCESS = 180;
const DEFAULT_FETCH_BATCH_SIZE = 10;
const DEFAULT_FETCH_LIMIT = 20;

export class FetchJob {

  private yildiz: Yildiz;
  private config: ServiceConfig;
  private metrics: Metrics;
  private redisClient: RedisClient;

  private expireInSec: number;
  private fetchIntervalInSec: number;
  private fetchLastAccess: number;
  private fetchBatchSize: number;
  private limit: number;

  private tov!: NodeJS.Timer | number;
  private graphAccess!: GraphAccess;

  constructor(yildiz: Yildiz, metrics: Metrics, redisClient: RedisClient) {

    this.redisClient = redisClient;
    this.yildiz = yildiz;
    this.config = yildiz.config;
    this.metrics = metrics;

    const {
      expireInSec = DEFAULT_EXP_IN_SEC,
      fetchIntervalInSec = DEFAULT_FETCH_INTERV_IN_SEC,
      fetchLastAccess = DEFAULT_FETCH_LAST_ACCESS,
      fetchBatchSize = DEFAULT_FETCH_BATCH_SIZE,
      limit = DEFAULT_FETCH_LIMIT,
    } = this.config.fetchJob || {};

    // How long the keys are going to expire in redis
    this.expireInSec = expireInSec;

    // Fetch Interval for job
    this.fetchIntervalInSec = fetchIntervalInSec;

    // How long the cache is stored until it should be fetched again
    this.fetchLastAccess = fetchLastAccess;

    // Batch size for storing the cache
    this.fetchBatchSize = fetchBatchSize;

    // Limit in retrieving the lastAccess nodeId from redis
    this.limit = limit;
  }

  private arrayToChunks(array: string[], size: number) {

    const result = [];
    for (let i = 0; i < array.length; i += size) {
        const chunk = array.slice(i, i + size);
        result.push(chunk);
    }
    return result;
  }

  private runJob() {

    this.tov = setTimeout(async () => {

      try {
        await this.jobAction();
      } catch (error) {
        debug("error while running job", error);
        this.runJob();
      }

    }, this.fetchIntervalInSec * 1000);
  }

  private async jobAction(): Promise<void> {

    let keys = null;

    try {

      keys = await this.getKeysToBeCached();

      if (!keys || !keys.length) {
        return this.runJob();
      }

      await this.batchFetch(keys);
    } catch (error) {
      debug("error occurred when running job", error.message);
    }

    if (keys && (keys.length === this.limit)) {
      return await this.jobAction();
    }

    return this.runJob();
  }

  private async getKeysToBeCached() {

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
      .filter((value: string) => keys.indexOf(value) === -1)
      .concat(keys);

    await this.redisClient.setCacheRefresh(keysToBeCached);

    // If CR_SET not in LA_SET, remove the keys from CR_SET
    const keysToBeRemoved = keys
      .filter((value: string) => accessedKeys.indexOf(value) === -1);

    // If it is not there, remove the keys from CACHEREFRESH_SET
    if (keysToBeRemoved.length) {
      debug(`expired keys found from CR_SET, removed ${keysToBeRemoved.length} keys`);
      await this.redisClient.clearCacheRefresh(keysToBeRemoved);
    }

    debug(`scanning keys, found ${keysToBeCached.length} keys to be cached`);

    // Otherwise cache the keys
    return keysToBeCached;
  }

  public async batchFetch(keys: string[]) {

    debug(`Job executed to cache ${keys.length} keys`);

    if (keys.length < this.fetchBatchSize) {
      return await this.graphAccess.setCacheLastAccess(keys);
    }

    const batchedKeys = this.arrayToChunks(keys, this.fetchBatchSize);

    for (const batch of batchedKeys) {
      await this.graphAccess.setCacheLastAccess(batch);
    }

  }

  public async init() {
    this.graphAccess = await this.yildiz.getGraphAccess();
    debug("Running job to cache nodes");
    this.runJob();
  }

  public async bumpTTL(key: string | string[]) {
    await this.redisClient.setLastAccess(key);
  }

  public async close() {
    if (this.tov) {
      clearTimeout(this.tov as NodeJS.Timer);
    }
  }
}
