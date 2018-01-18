"use strict";

const debug = require("debug")("yildiz:procedure:depthtransfer");
const Procedure = require("./Procedure.js");
const sql = require("./sqlDepthTransfer.js");

const DEFAULT_DEPTH_MIN_AGE_MINUTES = 5;
const DEFAULT_MIN_AGE_TYPE = "MINUTE";

const SUPPORTED_AGE_TYPES = [
    "MINUTE",
    "SECOND",
    "HOUR",
    "DAY"
];

class DepthTransfer extends Procedure {

    constructor(yildiz, config = {}){
        super("y_depth_transfer", yildiz);

        this.minAge = config.minAge || DEFAULT_DEPTH_MIN_AGE_MINUTES;
        this.minAgeType = config.minAgeType || DEFAULT_MIN_AGE_TYPE;

        if(SUPPORTED_AGE_TYPES.indexOf(this.minAgeType) === -1){
            throw new Error("minAgeType must be one of the following: " + 
                SUPPORTED_AGE_TYPES.join(", ") + "; input: " + this.minAgeType +
                " is therefor not supported.");
        }
    }

    async call(edgeId){
        const startTime = Date.now();
        const keyWord = this.yildiz.config.database.dialect === "mysql" ? "CALL" : "SELECT * FROM";
        const upsert = `${keyWord} ${super.getName()}(:edgeId);`;
        return await this.yildiz.raw(upsert, {
            edgeId
        }).then(results => {

            let depths = 0;

            if(!results || !Array.isArray(results) ||
                typeof results[0] !== "object" || !results[0]){
                    debug("Procedure result was malformed.", results);
                    throw new Error("Procedure result was malformed.");
                }

            if (results[0] && results[0]["0"] && typeof results[0]["0"] === "object") {
                const [result, _] = results;
                const {depthCount} = result["0"];
                depths = depthCount;
            }
            else {
                const {depthcount} = results[0];
                depths = depthcount;
            }


            const diff = Date.now() - startTime;
            this.storeExecutionTime(diff);
            debug("procedure call took", diff, "ms");

            return {
                depthCount: depths
            };
        });
    }

    async storeProcedure(force = false){

        const edgeTable = `${this.yildiz.prefix}_edges`;
        const depthTable = `${this.yildiz.prefix}_depths`;

        try {

            if(force){
                const funcOrProc = this.yildiz.config.database.dialect === "mysql" ? "PROCEDURE" : "FUNCTION";
                await this.yildiz.spread(`DROP ${funcOrProc} IF EXISTS ${super.getName()};`);
            }
    
            const doesExist = await super.procedureExists();
            if(doesExist){
                debug(super.getName(), "procedure already exists.");
                return;
            }
        } catch(error){
            debug("Failed to check for procedure status", super.getName(), error.message);
            return;
        }

        const replacement = {
            procedureName: super.getName(),
            edgeTable,
            depthTable,
            minAge: this.minAge,
            minAgeType: this.minAgeType
        }

        const procedure = sql(replacement, this.yildiz.config.database.dialect);

        debug("storing procedure");
        return await this.yildiz.spread(procedure);
    }
}

module.exports = DepthTransfer;