import cache from "memory-cache";
import promClient, { Registry } from "prom-client";
import Debug from "debug";

import { Yildiz } from "./Yildiz";
import { Metrics } from "./metrics/Metrics.js";
import { ServiceConfig } from "../interfaces/ServiceConfig";

const CACHE_TIME_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_DIFF_MS = CACHE_TIME_MS * 0.9; // almost 15 minutes
const FACTORY_METRICS_PREFIX = "__FACTORY__";

const promRegistry = promClient.Registry;
const debug = Debug("yildiz:factory");

export interface BlockedInstance {
    [key: string]: Promise<Yildiz>;
}

export interface UpdatedTimestamp {
    [key: string]: number;
}

export interface MetricsRegisters {
    [key: string]: Registry;
}

export interface StatsObjects {
    [key: string]: {
        up: boolean;
    };
}

export class YildizFactory {

    private baseConfig: ServiceConfig;
    private cache: cache.CacheClass<string, Yildiz>;
    private blocked: BlockedInstance;
    private updated: UpdatedTimestamp;
    public metrics: Metrics;
    private metricsRegisters: MetricsRegisters;

    constructor(config: ServiceConfig) {
        this.baseConfig = config;
        this.cache = new cache.Cache();

        this.blocked = {};
        this.updated = {};
        this.metricsRegisters = {};

        this.metrics = new Metrics(FACTORY_METRICS_PREFIX);
        this.metrics.registerDefault();

        this.metricsRegisters[FACTORY_METRICS_PREFIX] = this.metrics.getRegister();
    }

    public async getStats() {
        return (await Promise.all(
            this.cache.keys()
                .map(async (prefix: string) => ({
                    prefix,
                    stats: await this.cache.get(prefix).getStats(),
                })),
        ))
        .reduce((val: StatsObjects, current) => {
            const { prefix, stats } = current;
            val[prefix] = stats;
            return val;
        }, {});
    }

    private storeInstance(prefix: string, instance: Yildiz) {

        this.cache.put(prefix, instance, CACHE_TIME_MS, () => {
            try {
                debug(`factory instance timeout reached for ${prefix}, closing and removing from cache.`);
                delete this.updated[prefix];
                instance.close();
            } catch (error) {
                debug("cache ran out, closing error", error);
            }
        });

        this.updated[prefix] = Date.now();
    }

    private prolongCachetime(prefix: string, instance: Yildiz) {

        if (!this.updated[prefix]) {
            return;
        }

        const diff = Date.now() - this.updated[prefix];
        if (diff < REFRESH_DIFF_MS) {
            return;
        }

        // Reset key with new timeout
        this.storeInstance(prefix, instance);
    }

    public async get(prefix: string = "kc0") {

        // Instance wasnt present in cache, but there is already a process
        // That creates a new instance, resolve to same promise
        if (this.blocked[prefix]) {
            return await this.blocked[prefix];
        }

        // Instance is present, check if we need to pro-long cache
        // and resolve with instance
        let instance = this.cache.get(prefix);
        if (instance) {
            this.prolongCachetime(prefix, instance);
            return instance;
        }

        // Instance is not present, create blocking promise for future requests during init
        // Init, set cache and clean-up afterwards
        this.blocked[prefix] = new Promise((resolve, reject) => {
            const newInstance = new Yildiz(prefix, this.baseConfig);
            newInstance.init().then(() => {
                this.storeInstance(prefix, newInstance);
                resolve(newInstance);
            }).catch(reject);
        });

        instance = await this.blocked[prefix];
        delete this.blocked[prefix]; // Clean-up

        // TODO: Delete at some point if the keys are too many
        this.metricsRegisters[prefix] = instance.metrics.getRegister();
        return instance;
    }

    public getAllMetricsRegisters() {

        // Return empty array if the registers is not initialized
        if (!Object.keys(this.metricsRegisters).length) {
            return [];
        }

        const array: Registry[] = [];

        Object.keys(this.metricsRegisters).forEach((prefix: string) => {
            array.push(this.metricsRegisters[prefix]);
        });

        return promRegistry.merge(array);
    }

    public async closeAll() {

        await Promise.all(this.cache.keys()
            .map((key: string) => this.cache.get(key))
            .map((instance: Yildiz) => instance.close()));

        this.metrics.close();

        this.metricsRegisters = {};
        this.cache.clear();
    }
}
