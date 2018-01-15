"use strict";

const {
    RelationUpsert,
    RelationUpsertNoTrans,
    DepthTransfer,
    DijkstraV1
} = require("./procedures/index.js");

class ProcedureLoader {

    constructor(yildiz, config = {}){

        this.yildiz = yildiz;
        this.loaded = false;
        this.config = config;

        this.stored = {
            relationUpsert: null,
            relationUpsertNoTrans: null,
            depthTransfer: null,
            dijkstrav1: null
        };
    }

    async load(){

        if(this.loaded){
            return;
        }

        const procedures = {
            relationUpsert: RelationUpsert,
            relationUpsertNoTrans: RelationUpsertNoTrans,
            depthTransfer: DepthTransfer,
            //dijkstrav1: DijkstraV1 //TODO finish dijkstra for mysql 5.7 and store procedure
        };

        await Promise.all(Object.keys(procedures).map(async key => {
            const procedure = new procedures[key](this.yildiz, this.config[key] || {});
            await procedure.storeProcedure();
            this.stored[key] = procedure;
        }));

        this.loaded = true;
    }

    getProcedure(name){

        if(!name || !this.stored[name]){
            throw new Error(name + " procedure does not exist.");
        }

        return this.stored[name];
    }
}

module.exports = ProcedureLoader;