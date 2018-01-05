"use strict";

const {
    RelationUpsert,
    RelationUpsertNoTrans
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

        const relationUpsertNoTrans = new RelationUpsertNoTrans(this.yildiz);
        await relationUpsertNoTrans.storeProcedure();
        this.stored.relationUpsertNoTrans = relationUpsertNoTrans;

        //TODO finish dijkstra for mysql 5.7 and store procedure

        this.loaded = true;
    }
}

module.exports = ProcedureLoader;