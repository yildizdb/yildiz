"use strict";

const debug = require("debug")("yildiz:procedure");
const pjson = require("./../../../package.json")

class Procedure {

    constructor(name, yildiz){

        this.name = name;
        this.yildiz = yildiz;
        this.version = pjson.version || "1.0.0";
        this.version = this.version.replace(/\./g, "_");

        debug(`Loading ${this.name} procedure.`);
    }

    getName(){
        return `${this.yildiz.prefix}_${this.version}_${this.name}`;
    }

    async procedureExists(){

        const mysql = `SELECT ROUTINE_NAME AS name
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_TYPE="PROCEDURE"`;

        const postgres = `SELECT proname AS name
            FROM pg_catalog.pg_proc
            JOIN pg_namespace ON pg_catalog.pg_proc.pronamespace = pg_namespace.oid
            WHERE pg_namespace.nspname = 'public'`;

        const sql = this.yildiz.config.database.dialect === "mysql" ? mysql : postgres;

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