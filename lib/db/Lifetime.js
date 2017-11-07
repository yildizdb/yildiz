"use strict";

const debug = require("debug")("krakn:lifetime");

class Lifetime {

    constructor(krakn, options = {}){
        this.krakn = krakn;
        this.options = options;
        this._intv = null;
        
        this._init();
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
            const startTime = Date.now();
            this._job().then(affected => {
                const diff = Date.now() - startTime;
                debug(`ttl job done took ${diff} ms, removed ${affected} rows.`);
            }).catch(error => {
                debug("ttl job failed.", error);
            });
        }, jobIntervalInSec);
    }

    _job(){

        const translatesQuery = `DELETE FROM ${this.krakn.prefix}_translates
        WHERE ttld = 1 AND created_at > (NOW() - INTERVAL :seconds SECOND)`;

        const nodesQuery = `DELETE FROM ${this.krakn.prefix}_nodes
        WHERE ttld = 1 AND created_at > (NOW() - INTERVAL :seconds SECOND)`;

        const edgesQuery = `DELETE FROM ${this.krakn.prefix}_edges
        WHERE ttld = 1 AND created_at > (NOW() - INTERVAL :seconds SECOND)`;

        return Promise.all([
            this.krakn.spread(translatesQuery, { seconds: this.options.lifeTimeInSec }),
            this.krakn.spread(nodesQuery, { seconds: this.options.lifeTimeInSec }),
            this.krakn.spread(edgesQuery, { seconds: this.options.lifeTimeInSec })
        ]).then(results => {
            let affected = 0;
            results.forEach(result => {
                if(result && result.affectedRows){
                    affected += affectedRows;
                }
            });
            return affected;
        });
    }

    close(){
        if(this._intv){
            debug("stopping ttl job.");
            clearInterval(this._intv);
        }
    }
}

module.exports = Lifetime;