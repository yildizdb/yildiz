"use strict";

const debug = require("debug")("yildiz:lifetime");

class Lifetime {

    constructor(yildiz, options = {}){
        this.yildiz = yildiz;
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

        this._intv = setInterval(() => {
            this._incStat("job_runs");
            const startTime = Date.now();
            this._job().then(affected => {
                const diff = Date.now() - startTime;
                debug(`ttl job done took ${diff} ms, removed ${affected} rows.`);
            }).catch(error => {
                this._incStat("job_errors");
                debug("ttl job failed.", error);
            });
        }, jobIntervalInSec * 1000);
    }

    async _job(){

        const secondQuery = this.yildiz.config.database.dialect === "mysql" ? ":seconds SECOND" : "':seconds SECOND'"; 

        const translatesQuery = `DELETE FROM ${this.yildiz.prefix}_translates
        WHERE ttld = true AND created_at > (NOW() - INTERVAL ${secondQuery})`;

        const nodesQuery = `DELETE FROM ${this.yildiz.prefix}_nodes
        WHERE ttld = true AND created_at > (NOW() - INTERVAL ${secondQuery})`;

        const edgesQuery = `DELETE FROM ${this.yildiz.prefix}_edges
        WHERE ttld = true AND created_at > (NOW() - INTERVAL ${secondQuery})`;

        const results = [];

        //first translates
        results.push(await this.yildiz.spread(translatesQuery, { seconds: this.options.lifeTimeInSec }).then(result => {
            const rows = result.affectedRows || result.changedRows || result.rowCount;
            if(result && rows){
                this._incStat("translate_removes", rows);
            }
            return result;
        }));
        
        //second edges
        results.push(await this.yildiz.spread(edgesQuery, { seconds: this.options.lifeTimeInSec }).then(result => {
            const rows = result.affectedRows || result.changedRows || result.rowCount;
            if(result && rows){
                this._incStat("edge_removes", rows);
            }
            return result;
        }));

        //third nodes
        results.push(await this.yildiz.spread(nodesQuery, { seconds: this.options.lifeTimeInSec }).then(result => {
            const rows = result.affectedRows || result.changedRows || result.rowCount;
            if(result && rows){
                this._incStat("node_removes", rows);
            }
            return result;
        }));

        let affected = 0;
        results.forEach(result => {
            const rows = result.affectedRows || result.changedRows || result.rowCount;
            if(result && rows){
                this._incStat("total_removes", rows);
                affected += rows;
            }
        });
    
        return affected;
    }

    close(){
        if(this._intv){
            debug("stopping ttl job.");
            clearInterval(this._intv);
        }
    }
}

module.exports = Lifetime;