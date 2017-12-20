"use strict";

const debug = require("debug")("yildiz:http:metrics");
const promClient = require("prom-client");
const promDefaultMetrics = promClient.collectDefaultMetrics;
const PromRegistry = promClient.Registry;

const DEFAULT_INTV_MS = 2500;

class Metrics {

    constructor(server){
        this.server = server;
        this.register = new PromRegistry();
        this._defaultMetricsIntv = null;
        this._intv = null;
        this.metrics = {}; //stores metric objects
        this.cache = {}; //stores old stat values
    }

    exportType(){
        return this.register.contentType;
    }

    exportMetrics(){
        return this.register.metrics();
    }

    getCounter(key){

        if(this.metrics[key]){
            return this.metrics[key];
        }

        this.metrics[key] = new promClient.Counter({
            name: `${key}`,
            help: `${key}_help`,
            registers: [this.register],
            labelNames: ["na"]
        });

        return this.metrics[key];
    }

    getGauge(key){
        
        //prefix
        key = `gauge_${key}`;

        if(this.metrics[key]){
            return this.metrics[key];
        }
        
        this.metrics[key] = new promClient.Gauge({
            name: `${key}`,
            help: `${key}_help`,
            registers: [this.register],
            labelNames: ["na"]
        });

        return this.metrics[key];
    }

    incCounter(prefix, key, val){
        try {
            const cacheKey = `${prefix}_${key}`;
            const counter = this.getCounter(key); 
            
             if(!this.cache[cacheKey]){
                 this.cache[cacheKey] = val;
                 return counter.inc({
                 prefix
                 }, val);
             }

             //counter cannot be set, they can only be increased
             const diff = val - this.cache[cacheKey];
             if(diff <= 0){
                 return;
             } 

             counter.inc({
                 prefix
             }, diff);

             this.cache[cacheKey] = val;
        } catch(error){
            debug("Failed to convert counter stat to metrics", error);
        }
    }

    setGauge(prefix, key, val){
        try {
            const gauge = this.getGauge(key);

            gauge.set({
                prefix
            }, val);

        } catch(error){
            debug("Failed to convert gauge stat to metrics", error);
        }
    }

    run(){

        this._defaultMetricsIntv = promDefaultMetrics({
            registry: this.register,
            timeout: 5000
        });

        this._intv = setInterval(() => {
            this._processStatsIntoMetrics().catch(error => debug("Failed to process metrics", error));
        }, DEFAULT_INTV_MS);

        this._processStatsIntoMetrics().catch(error => debug("Failed to process metrics", error)); //trigger asap
        debug("metrics active.");
    }

    close(){

        if(this._intv){
            clearInterval(this._intv);
        }

        if(this._defaultMetricsIntv){
            clearInterval(this._defaultMetricsIntv);
        }

        this.metrics = {};
        this.cache = {};
        this.register.clear();
    }

    async _processStatsIntoMetrics(){

        const stats = await this.server.getStats();
        const factoryStats = stats.factory;

        //convert factory stats into counter metrics
        //using the yilidz prefix as label
        Object.keys(factoryStats).forEach(prefix => {
            Object.keys(factoryStats[prefix]).forEach(block => {

                //cache block has sub-objects
                if(block === "cache"){

                    Object.keys(factoryStats[prefix].cache.nodes).forEach(name => {
                        const key = `cache_nodes_${name}`;
                        this.incCounter(prefix, key, factoryStats[prefix].cache.nodes[name]);
                    });

                    Object.keys(factoryStats[prefix].cache.edges).forEach(name => {
                        const key = `cache_edges_${name}`;
                        this.incCounter(prefix, key, factoryStats[prefix].cache.edges[name]);
                    });

                    Object.keys(factoryStats[prefix].cache).forEach(name => {
                        if(typeof factoryStats[prefix].cache[name] !== "object"){
                            const key = `cache_${name}`;
                            this.incCounter(prefix, key, factoryStats[prefix].cache[name]);
                        }
                    });

                    return;
                }

                //other blocks have no sub-objects
                Object.keys(factoryStats[prefix][block]).forEach(name => {
                    const val = factoryStats[prefix][block][name];
                    const key = `${block}_${name}`;
                    this.incCounter(prefix, key, val);
                });
            });
        });

        //convert other stats to metrics (http)
        Object.keys(stats.http).forEach(name => {
            const val = stats.http[name];
            const key = `http_${name}`;
            this.incCounter("stats", key, val);
        });

        //misc stats
        this.setGauge("stats", "http_avg_res_time", stats.avgResponseTime);
    }
}

module.exports = Metrics;