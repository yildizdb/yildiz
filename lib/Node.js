"use strict";

class Node {

    constructor(handler, self){
        this.self = self;
        this.handler = handler;
    }

    getProperties(){
        return this.self.get();
    }

    async getEdgedNodes(){
        return this.self.getOtherNodes().map(dbNode => new Node(this.handler, dbNode));
    }

}

module.exports = Node;
