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
        this._build = null;
    }

    exportType(){
        return this.register.contentType;
    }

    exportMetrics(){
        return this.register.metrics();
    }

    _buildMetrics(){

        if(this._build){
            return; //only build them once
        }

        this._build = {};

        this._build["bla"] = new promClient.Counter({
            name: 'metric_name',
            help: 'metric_help',
            registers: [this.register]
        });
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

        //TODO build metrics for stats
        this._buildMetrics();
        
        //TODO apply stats to metrics
    }
}

module.exports = Metrics;