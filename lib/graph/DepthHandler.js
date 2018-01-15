"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:depthhandler");

class DepthHandler {
 
    constructor(yildiz){
        this.yildiz = yildiz;
        this._depth = this.yildiz.models.Depth;

        try {
            const depthTransfer = this.yildiz.procedureLoader.getProcedure("depthTransfer");
            this.minAge = depthTransfer.minAge;
            this.minAgeType = depthTransfer.minAgeType;
        } catch(error){
            throw new Error("DepthHandler constructor must not be called before procedures are loaded.");
        }
    }

    increaseDepthCount(edgeId){

        //TODO procedure for ids(first, second, relation) to edgeId to insert

        const depthTable = `${this.yildiz.prefix}_depths`;

        const sql = `INSERT INTO ${depthTable} (edge_id, created_at) 
        VALUES(:edgeId, NOW());`;

        return this.yildiz.spread(sql, {
            edgeId
        });
    }

    decreaseDepthCount(edgeId){

        //TODO procedure for ids(first, second, relation) to edgeId to delete

        const depthTable = `${this.yildiz.prefix}_depths`;
        const edgeTable = `${this.yildiz.prefix}_edges`;
        const sql = `DELETE FROM ${depthTable} WHERE edge_id = :edgeId LIMIT 1`;

        return this.yildiz.spread(sql, {
            edgeId
        }).then(result => {

            if(result && result.affectedRows){
                return true;
            }

            //no entries in depth table found, manually adapt edge table
            const updateSql = `UPDATE ${edgeTable} SET depth = depth - 1 WHERE id = :edgeId`;
            return this.yildiz.spread(updateSql, {
                edgeId
            });
        });
    }

    findPotentialEdgeIds(){

        const depthTable = `${this.yildiz.prefix}_depths`;
        
        const sql = `SELECT DISTINCT edge_id
        FROM ${depthTable}
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ${this.minAge} ${this.minAgeType});`;

        return this.yildiz.raw(sql, {})
            .then(results => {

                if(results && Array.isArray(results)){
                    return results.map(result => {
                        return result.edge_id;
                    });
                }

                return [];
            });
    }
}

module.exports = DepthHandler;