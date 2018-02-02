"use strict";

const debug = require("debug")("yildiz:http:metrics");
const promClient = require("prom-client");
const promDefaultMetrics = promClient.collectDefaultMetrics;
const PromRegistry = promClient.Registry;

const DEFAULT_INTV_MS = 2500;

class Metrics {

    constructor(yildiz){
        this.yildiz = yildiz;
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
            labelNames: ["na", "prefix"]
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
            labelNames: ["na", "prefix"] //gauges require fixed prefixes
        });

        return this.metrics[key];
    }

    _inc(key, val){

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

    _set(key, val){
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
            register: this.register,
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

        const stats = await this.yildiz.getStats();
    }
}

module.exports = Metrics;