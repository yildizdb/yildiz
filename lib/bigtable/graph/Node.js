"use strict";

const BaseNode = require("./BaseNode.js");

class Node extends BaseNode {

    constructor(handler, self){
        super(handler, self);
    }

    async getEdgedNodes(){
        //will return nodes with the corresponding edge attached
        return this.self.getOther_nodes().map(dbNode => {
            return new EdgeNode(this.handler, dbNode);
        });
    }
}

module.exports = Node;
