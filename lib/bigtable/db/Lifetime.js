"use strict";

const moment = require("moment");
const debug = require("debug")("yildiz:lifetime");

class Lifetime {

    constructor(yildiz, options = {}){

        this.yildiz = yildiz;
        this.metadata = this.yildiz.metadata;
        this.dbConfig = this.yildiz.config.database;
        this.options = options;
        this._intv = null;
        this.stats = {};
        this._init();
    }

    getStats(){
        return this.stats;
    }

    _incStat(key, val = 1){
        if(!this.stats[key]){
            this.stats[key] = val;
        } else {
            this.stats[key] += val;
        }
    }

    async _getTTLIds(type) {

        if (!type) {
            return [];
        }
        
        const now = new Date();

        return await new Promise((resolve, reject) => {

            const results = [];

            this.yildiz.ttlTable.createReadStream({
                filter: [{
                    row: new RegExp(`.*${type}$`)
                },
                {
                    time: {
                        start: moment().subtract(this.options.lifeTimeInSec, "seconds").toDate(),
                        end: new Date()
                    }
                }]
            })
            .on("error", err => {
                reject(err);
            })
            .on("data", n => {
                results.push(n.id);
            })
            .on("end", n => {
                resolve(results);
            });
        });
    }

    _deleteTable() {

        const remove = (type) => {

            return async (keys) => {

                const tableName = type + "Table";
                const metadataType = type + "s";

                let cleanedKeys = keys;

                if (type !== "ttl") {
                    cleanedKeys = keys.map(x => x.split("-")[0]);
                }

                const deletedCounts = await Promise.all(
                    cleanedKeys.map(n => this.yildiz[tableName].row(n).delete())
                );

                this.metadata.decreaseCount(metadataType, deletedCounts.length);

                return { success: deletedCounts.length };
            };
        };

        return {
            node: remove("node"),
            ttl: remove("ttl")
        };
    }

    _init(){

        let {
            active,
            lifeTimeInSec,
            jobIntervalInSec,
        } = this.options;

        this.options.lifeTimeInSec = lifeTimeInSec || 86400;
        jobIntervalInSec = jobIntervalInSec || 120;

        if(!active){
            return debug("ttl job deactivated.");
        }

        debug(`ttl job active running every ${jobIntervalInSec} sec, deleting all ttld flags after ${this.options.lifeTimeInSec} sec.`);

        this._runJob(jobIntervalInSec);
    }

    _runJob(jobIntervalInSec) {

        this._tov = setTimeout(() => {
            this._incStat("job_runs");
            const startTime = Date.now();
            this._job().then(affected => {
                const diff = Date.now() - startTime;
                debug(`ttl job done took ${diff} ms, removed ${affected.rowCount} rows, from ${affected.tableCount} tables.`);
                this._runJob(jobIntervalInSec);
            }).catch(error => {
                this._incStat("job_errors");
                debug("ttl job failed.", error);
            });
        }, jobIntervalInSec * 1000);
    }

    async _job(){

        const deleteTTLOrigin = this._deleteTable();

        const results = [];

        // Remove Nodes
        const nodeKeys = await this._getTTLIds("nodes");
        results.push(await deleteTTLOrigin.node(nodeKeys));

        // Remove TTL 
        const ttlKeys = !this.dbConfig.singleTableMode ?
            translateKeys.concat(edgeKeys).concat(nodeKeys) :
            nodeKeys;
        
        results.push(await deleteTTLOrigin.ttl(ttlKeys));
        
        return {
            rowCount: results.map(n => n.success).reduce((a, b) => a + b, 0),
            tableCount: results.length
        };
    }

    close(){
        if(this._intv){
            debug("stopping ttl job.");
            clearTimeout(this._tov);
        }
    }
}

module.exports = Lifetime;