import { AnyObject } from "./Generic";

export interface InMemoryCacheConfig {
  nodeCacheTime: number;
  edgeCacheTime: number;
}

export interface TTLConfig {
  active: boolean;
  lifeTimeInSec: number;
  jobIntervalInSec: number;
  cacheLifeTimeInSec?: number;
}

export interface DatabaseConfig {
  dialect: string;
  projectId: string;
  instanceName: string;
  keyFilename: string;
  columnFamilyName: string;
  leftNodeEdge: boolean;
  rightNodeEdge: boolean;
  clusters?: string | string[];
  maxAgeSeconds?: number;
}

export interface RedisConfig {
  single?: {
      port: number;
      host: string;
      family?: number;
      db: number;
      keyPrefix?: string;
      retryStrategy?: any;
  };
  sentinels?: any;
  cluster?: any;
  ttl?: number;
  timeoutReady?: number;
}

export interface FetchJobConfig {
  expireInSec?: number;
  fetchIntervalInSec?: number;
  fetchLastAccess?: number;
  fetchBatchSize?: number;
  limit?: number;
  resolveNodes?: boolean;
}

export interface LookupCacheConfig {
  sizeIntervalInSec: number;
}

export interface MetadataConfig {
  saveMetadataInSec: number;
  readMetadataInSec: number;
}

export interface UpsertConfig {
  getEdgeTime?: boolean;
  upsertDebug?: boolean;
  translatedEdgeDebug?: boolean;
}

export interface ServiceConfig {
  accessLog: boolean;
  readinessEndpoint?: boolean;
  enableRaw: boolean;
  noBanner: boolean;
  promiseConcurrency?: number;
  ttl: TTLConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  maxLag?: number;
  lookupCache?: LookupCacheConfig;
  cache?: InMemoryCacheConfig;
  access?: string | AnyObject;
  metadata?: MetadataConfig;
  fetchJob?: FetchJobConfig;
  upsert?: UpsertConfig;
}
