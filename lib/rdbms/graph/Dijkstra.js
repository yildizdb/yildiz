"use strict";

class Dijkstra {

    constructor(yildiz){
        this.yildiz = yildiz;
    }

    executeProcedureVersion1(prefix, startNodeId, endNodeId){

        //TODO switch to ProcedureLoader.stored.instance

        const query = `CALL ${prefix}_dijkstrav1(:start, :end)`;
        return this.yildiz.raw(query, {
            start: startNodeId,
            end: endNodeId
        });
    }
}

module.exports = Dijkstra;