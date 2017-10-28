"use strict";

const DEFAULT_KEYS = [
    "id",
    "identifier",
    "data",
    "createdAt",
    "updatedAt"
];

class BaseNode {

    constructor(handler, self){
        this.handler = handler;
        this.self = self;
    }

    getProperties(){
        return this.self.get().data;
    }

    getIdentifier(){
        return this.self.get().identifier;
    }

    getKraknID(){
        return this.self.get().id;
    }

    getExtend(){

        const full = this.self.get();
        const data = {};

        Object
            .keys(full)
            .filter(key => DEFAULT_KEYS.indexOf(key) === -1)
            .forEach(key => data[key] = full[key]);

        return data;
    }

    getFull(){
        return this.self.get();
    }
}

module.exports = BaseNode;