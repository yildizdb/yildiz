"use strict";

const debug = require("debug")("yildiz:http:metrics");
const promClient = require("prom-client");
const promDefaultMetrics = promClient.collectDefaultMetrics;
const PromRegistry = promClient.Registry;

class Metrics {

    constructor(prefix){

        this.prefix = prefix === "__FACTORY__" ? null : prefix;
        this.register = new PromRegistry();
        this.metrics = {}; //stores metric objects
    }

    exportType(){
        return this.register.contentType;
    }

    exportMetrics(){
        return this.register.metrics();
    }

    getRegister() {
        return this.register;
    }

    _getCounter(key){

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

    _getGauge(key){
        
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

    inc(key, val = 1){

        const prefix = this.prefix;
        const fullKey = prefix ? `${prefix}_${key}` : key;
        const counter = this._getCounter(fullKey);

        counter.inc({
            prefix
        }, val);

    }

    set(key, val){

        if (val === null || val === undefined) {
            throw new Error(`Please provide value on set ${key}`);
        }

        const prefix = this.prefix;
        const fullKey = prefix ? `${prefix}_${key}` : key;
        const gauge = this._getGauge(fullKey);

        gauge.set({
            prefix
        }, val);
    }

    run(){

        this._defaultMetricsIntv = promDefaultMetrics({
            register: this.register,
            timeout: 5000
        });
        
        debug("metrics active.");
    }

    close(){

        this.metrics = {};
        this.register.clear();
    }
}

module.exports = Metrics;