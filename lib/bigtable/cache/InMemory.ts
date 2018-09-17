import cache from "memory-cache";

import { ServiceConfig } from "../../interfaces/ServiceConfig";
import { Metrics } from "../metrics/Metrics";
import { YildizSingleSchema } from "../../interfaces/Yildiz";
import { EdgeCache } from "../../interfaces/Graph";

const DEFAULT_NODE_CACHE_TIME = 8000;
const DEFAULT_EDGE_CACHE_TIME = 10000;

export class InMemory {

    private cache: cache.CacheClass<string, YildizSingleSchema | EdgeCache>;
    private metrics: Metrics;

    private nodeHits: number;
    private nodeMiss: number;
    private nodeSet: number;
    private edgeHits: number;
    private edgeMiss: number;
    private edgeSet: number;

    private dels: number;
    private clears: number;
    private nodeCacheTime: number;
    private edgeCacheTime: number;

    constructor(config: ServiceConfig, metrics: Metrics) {

        this.cache = new cache.Cache();
        this.metrics = metrics;

        this.nodeHits = 0;
        this.nodeMiss = 0;
        this.nodeSet = 0;

        this.edgeHits = 0;
        this.edgeMiss = 0;
        this.edgeSet = 0;

        this.dels = 0;
        this.clears = 0;

        this.nodeCacheTime = config.cache!.nodeCacheTime || DEFAULT_NODE_CACHE_TIME;
        this.edgeCacheTime = config.cache!.edgeCacheTime || DEFAULT_EDGE_CACHE_TIME;
    }

    public async getNode(key: string) {
        // Async to make it easier to replace with async client in the future
        const val = this.cache.get(key);

        if (val) {
            // Extend key on cache hit
            this.metrics.inc("cache_nodes_hit");
            await this.setNode(key, val as YildizSingleSchema);
        } else {
            this.metrics.inc("cache_nodes_miss");
        }

        return val;
    }

    public async getEdge(key: string) {

        // Async to make it easier to replace with async client in the future
        const val = this.cache.get(key);

        if (val) {
            // Extend key on cache hit
            this.metrics.inc("cache_edges_hit");
            await this.setEdge(key, val as EdgeCache);
        } else {
            this.metrics.inc("cache_edges_miss");
        }

        return val;
    }

    public async setNode(key: string, val: YildizSingleSchema) {

        // Async to make it easier to replace with async client in the future
        this.nodeSet++;
        return this.cache.put(key, val, this.nodeCacheTime);
    }

    public async setEdge(key: string, val: EdgeCache) {

        // Async to make it easier to replace with async client in the future
        this.edgeSet++;
        return this.cache.put(key, val, this.edgeCacheTime);
    }

    public async del(key: string) {

        // Async to make it easier to replace with async client in the future
        this.dels++;
        return this.cache.del(key);
    }

    public async clear() {
        // Async to make it easier to replace with async client in the future
        this.clears++;
        return this.cache.clear();
    }

    public async getStats() {
        // Async to make it easier to replace with async client in the future
        return {
            nodes: {
                hit: this.nodeHits,
                miss: this.nodeMiss,
                set: this.nodeSet,
            },
            edges: {
                hit: this.edgeHits,
                miss: this.edgeMiss,
                set: this.edgeSet,
            },
            size: this.cache.size(),
            deletes: this.dels,
            clears: this.clears,
        };
    }

    public async getKeys() {
        return this.cache.keys();
    }
}
