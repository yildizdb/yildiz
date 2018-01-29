"use strict";

class Node {

    constructor(handler, self){
        this.handler = handler;
        this.self = self;
    }

    getFull(){
        return this.self;
    }
}

module.exports = Node;
