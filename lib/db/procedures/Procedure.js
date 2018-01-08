"use strict";

const debug = require("debug")("yildiz:procedure");
const pjson = require("./../../../package.json")

class Procedure {

    constructor(name, yildiz){

        this.name = name;
        this.yildiz = yildiz;
        this.version = pjson.version || "1.0.0";
        this.version = this.version.replace(".", "_");

        debug(`Loading ${this.name} procedure.`);
    }

    getName(){
        return `${this.yildiz.prefix}_${this.version}_${this.name}`;
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