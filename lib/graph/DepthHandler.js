"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:depthhandler");

class DepthHandler {
 
    constructor(yildiz){
        this.yildiz = yildiz;
        this._depth = this.yildiz.models.Depth;
    }

    //TODO
}

module.exports = DepthHandler;