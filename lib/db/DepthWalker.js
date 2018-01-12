"use strict";

const debug = require("debug")("yildiz:depthwalker:main");

const DEFAULT_INTV = 1000 * 60 * 2; //2 minutes

class DepthWalker {

    constructor(yildiz, config = {}){

        this.yildiz = yildiz;
        this.config = config;

        this.depthHandler = null;
        this._intv = null;

        if(typeof this.config.disable === "boolean" && this.config.disable){
            debug("disabled.");
        } else {
            this._init().catch(error => {
                debug("exception during init", error.message);
            });
        }
    }

    async _walk(){

        debug("walking..");
        const startT = Date.now();

        //TODO this.depthHandler..

        const diff = Date.now() - startT;
        debug("done", diff, "ms needed.");
    }

    async _init(){

        this.depthHandler = await this.yildiz.getDepthHandler();

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

    close(){

        if(this._intv){
            clearInterval(this._intv);
            debug("closed");
        }
    }
}

module.exports = DepthWalker;