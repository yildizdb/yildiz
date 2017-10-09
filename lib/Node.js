"use strict";

const BaseNode = require("./BaseNode.js");
const EdgeNode = require("./EdgeNode.js");

class Node extends BaseNode {

    constructor(handler, self){
        super(handler, self);
    }

    async getEdgedNodes(){
        //will return nodes with the corresponding edge attached
        return this.self.getOtherNodes().map(dbNode => {
            return new EdgeNode(this.handler, dbNode);
        });
    }
}

module.exports = Node;
