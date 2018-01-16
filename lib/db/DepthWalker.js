"use strict";

const debug = require("debug")("yildiz:depthwalker:main");

const DEFAULT_INTV = 1000 * 60 * 2; //2 minutes

class DepthWalker {

    constructor(yildiz, config = {}){

        this.yildiz = yildiz;
        this.config = config;

        this.depthHandler = null;
        this.depthTransfer = null;
        this._intv = null;

        if(typeof this.config.disable === "boolean" && this.config.disable){
            debug("disabled.");
        } else {
            this._init().catch(error => {
                debug("exception during init", error.message);
            });
        }
    }

    async _init(){

        this.depthHandler = await this.yildiz.getDepthHandler();
        this.depthTransfer = this.yildiz.procedureLoader.getProcedure("depthTransfer");

        if(!this.depthTransfer){
            throw new Error("Failed to get DepthTransfer procedure.");
        }

        let {
            interval
        } = this.config;

        interval = interval || DEFAULT_INTV;

        this._intv = setInterval(() => {
            this._walk().catch(error => {
                debug("exception during walk", error.message);
            });
        }, interval);

        debug("started");
    }

    async _deleteAllCacheKeys(){

        const keys = await this.yildiz.cache.getKeys();
        return await Promise.all(keys.map(async key => {

            if(!key.startsWith("eei:")){
                return null;
            }

            return await this.yildiz.cache.del(key);
        }));
    }

    async _walk(){

        debug("walking..");
        const startT = Date.now();

        const edgeIds = await this.depthHandler.findPotentialEdgeIds();
        debug("calling...");

        if(!edgeIds || !edgeIds.length){
            return debug("Not transferable depth entries found.");
        }

        await Promise.all(edgeIds.map(async edgeId => {
            try {
                return await this.depthTransfer.call(edgeId);
            } catch(error){
                debug("execution error of depth transfer:", error.message, "for edge:", edgeId);
                return null;
            }
        }));

        await this._deleteAllCacheKeys();

        const diff = Date.now() - startT;
        debug("done", diff, "ms needed.");
    }

    close(){

        if(this._intv){
            clearInterval(this._intv);
            debug("closed");
        }
    }
}

module.exports = DepthWalker;