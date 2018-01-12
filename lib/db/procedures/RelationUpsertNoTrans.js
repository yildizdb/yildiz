"use strict";

const debug = require("debug")("yildiz:procedure:relationupsert");
const Procedure = require("./Procedure.js");
const sql = require("./sqlRelationUpsertNoTrans.js");

class RelationUpsertNoTrans extends Procedure {

    constructor(yildiz){
        super("y_relation_upsert_nt", yildiz);
    }

    async call(idEdge, idNode1, idNode2, identifier1, identifier2, data1, data2, value1, value2, ttld, relation, data3, mode){
        const startTime = Date.now();
        const keyWord = this.yildiz.config.database.dialect === "mysql" ? "CALL" : "SELECT * FROM";
        const upsertNodes = `${keyWord} ${super.getName()}(:idEdge, :idNode1, :idNode2, :identifier1, :identifier2, :data1, :data2, :value1, :value2, :ttld, :relation, :data3, :mode);`;
        return await this.yildiz.raw(upsertNodes, {
            idEdge,
            idNode1,
            idNode2,
            identifier1,
            identifier2,
            data1: JSON.stringify(data1),
            data2: JSON.stringify(data2),
            value1,
            value2,
            ttld,
            relation,
            data3: JSON.stringify(data3),
            mode
        }).then(results => {

            let leftNode = null;
            let rightNode = null;
            let edge = null;

            if(!results || !Array.isArray(results) ||
                typeof results[0] !== "object" || !results[0]){
                    debug("Procedure result was malformed.", results);
                    throw new Error("Procedure result was malformed.");
                }

            if (results[0] && results[0]["0"] && typeof results[0]["0"] === "object") {
                const [result, _] = results;
                const {id1, id2, edgeId} = result["0"];
                leftNode = id1;
                rightNode = id2;
                edge = edgeId;
            }
            else {
                const {nodeid1, nodeid2, edgeid} = results[0];
                leftNode = nodeid1;
                rightNode = nodeid2;
                edge = edgeid;
            }

            const diff = Date.now() - startTime;
            debug("procedure call took", diff, "ms");

            return {
                leftNodeId: leftNode,
                rightNodeId: rightNode,
                edgeId: edge,
                leftNodeIdentifier: identifier1,
                rightNodeIdentifier: identifier2
            };
        });
    }

    async storeProcedure(force = false){

        const procedureName = super.getName();
        const edgeTable = `${this.yildiz.prefix}_edges`;
        const nodeTable = `${this.yildiz.prefix}_nodes`;
        const translateTable = `${this.yildiz.prefix}_translates`;
        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        const replacement = {
            procedureName,
            edgeTable,
            nodeTable,
            translateTable,
            firstNode,
            secondNode
        };

        try {

            if(force){
                await this.yildiz.spread(`DROP FUNCTION IF EXISTS ${super.getName()};`);
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

        const procedure = sql(replacement, this.yildiz.config.database.dialect);

        debug("storing procedure");
        return await this.yildiz.spread(procedure);
    }
}

module.exports = RelationUpsertNoTrans;