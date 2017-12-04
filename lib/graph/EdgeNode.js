"use strict";

const BaseNode = require("./BaseNode.js");

class EdgeNode extends BaseNode {

    constructor(handler, self){
        super(handler, self);
    }

    getEdge(){
        return this.self.get()[`${this.handler.yildiz.prefix}_edge`].get();
    }

    getAttributes(){
        return this.getEdge().data;
    }
}

module.exports = EdgeNode;