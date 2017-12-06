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
            help: '${key}_help',
            registers: [this.register],
            labelNames: ["na"]
        });

        return this.metrics[key];
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

        this._build = null;
        this.register.clear();
    }

    async _processStatsIntoMetrics(){

        const factoryStats = await this.server.factory.getStats();
        
        if(!factoryStats || !Object.keys(factoryStats).length){
            return debug("stats not ready yet.");
        }

        //convert factory stats into counter metrics
        //using the yilidz prefix as label
        Object.keys(factoryStats).forEach(prefix => {
            Object.keys(factoryStats[prefix]).forEach(block => {

                if(block === "cache"){
                    return;
                }

                Object.keys(factoryStats[prefix][block]).forEach(name => {

                    try {
                        const val = factoryStats[prefix][block][name];
                        const key = `${block}_${name}`;
                        const cacheKey = `${prefix}_${block}_${name}`;
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
                    } catch(error) {
                        debug("Failed to convert stat to metrics", error);
                    }
                });
            });
        });
    }
}

module.exports = Metrics;