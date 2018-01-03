"use strict";

const debug = require("debug")("yildiz:procedure");

class Procedure {

    constructor(name, yildiz){
        this.name = name;
        this.yildiz = yildiz;

        debug(`Loading ${this.name} procedure.`);
    }

    getName(){
        return `${this.yildiz.prefix}_${this.name}`;
    }

    async procedureExists(){

        const sql = `SELECT ROUTINE_NAME AS name
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_TYPE="PROCEDURE";`;

        return await this.yildiz.raw(sql).then(results => {
            
            results = results.map(result => result.name);
            if(!results || results.indexOf(this.getName()) === -1){
                return false;
            }

            return true;
        });
    }
}

module.exports = Procedure;