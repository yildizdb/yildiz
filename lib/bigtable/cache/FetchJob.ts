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
const DEFAULT_FETCH_LIMIT = 20;

export class FetchJob {

  private yildiz: Yildiz;
  private config: ServiceConfig;
  private metrics: Metrics;
  private redisClient: RedisClient;

  private expireInSec: number;
  private fetchIntervalInSec: number;
  private fetchLastAccess: number;
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
      limit = DEFAULT_FETCH_LIMIT,
    } = this.config.fetchJob || {};

    // How long the keys are going to expire in redis
    this.expireInSec = expireInSec;

    // Fetch Interval for job
    this.fetchIntervalInSec = fetchIntervalInSec;

    // How long the cache is stored until it should be fetched again
    this.fetchLastAccess = fetchLastAccess;

    // Limit in retrieving the lastAccess nodeId from redis
    this.limit = limit;
  }

  private resetJob() {

    this.tov = setTimeout(async () => {

      try {
        const startJob = Date.now();
        await this.jobAction(startJob);
      } catch (error) {
        debug("error while running job", error);
        this.resetJob();
      }

    }, this.fetchIntervalInSec * 1000);
  }

  private async jobAction(startJob: number): Promise<void> {

    let keys = null;

    try {
      keys = await this.getKeysToBeCached();
    } catch (error) {
      debug("error occurred when getting keys", error.message);
    }

    // Reset the job if the keys need to be cached
    if (!keys || !keys.length) {
      this.metrics.inc("fetchJob_runs");
      this.metrics.inc("fetchJob_duration", Date.now() - startJob);
      return this.resetJob();
    }

    try {
      await this.graphAccess.edgeInfoForNodesRelatingToTranslateValues(keys);
    } catch (error) {
      debug("error occurred while caching", error.message);
    }

    return await this.jobAction(startJob);
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
      this.metrics.inc("fetchJob_removed_keys", keys.length);

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
      this.metrics.inc("fetchJob_removed_keys", keysToBeRemoved.length);
    }

    const keysToBeCachedLength = keysToBeCached.length;

    debug(`scanning keys, found ${keysToBeCachedLength} keys to be cached`);
    this.metrics.inc("fetchJob_caching_keys", keysToBeCachedLength);

    // Otherwise cache the keys
    return keysToBeCached;
  }

  public async init() {
    this.graphAccess = await this.yildiz.getGraphAccess();
    debug("Running job to cache nodes");
    this.resetJob();
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
