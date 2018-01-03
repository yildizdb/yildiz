"use strict";

const {
    RelationUpsert
} = require("./procedures/index.js");

class ProcedureLoader {

    constructor(yildiz){
        this.yildiz = yildiz;
        this.loaded = false;
        this.stored = {};
    }

    async load(){

        if(this.loaded){
            return;
        }

        //TODO generalise

        const relationUpsert = new RelationUpsert(this.yildiz);
        await relationUpsert.storeProcedure();
        this.stored.relationUpsert = relationUpsert;

        //TODO finish dijkstra for mysql 5.7 and store procedure

        this.loaded = true;
    }
}

module.exports = ProcedureLoader;