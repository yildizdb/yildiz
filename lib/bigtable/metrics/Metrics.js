"use strict";

class Metrics {

    constructor(){

    }

    export(){
        returns "prom metrics as txt";
    }

    _set(){

    }

    _inc(){

    }

    setNodeCreationTime(){

    }

    setEdgeCreationTime(ms){
        this._set("gaugename", ms);
    }
}

module.exports = Metrics;