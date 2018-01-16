"use strict";

const Promise = require("bluebird");
const validator = require("validator");
const {generateId} = require("../utils/index.js");

class GraphAccess {

    constructor(yildiz){
        this.yildiz = yildiz;
        this.nodeHandler = null;
        this.translator = null;
    }

    async init(){
        this.nodeHandler = await this.yildiz.getNodeHandler();
        this.translator = await this.yildiz.getTranslator();
    }

    _incStat(key){
        return this.yildiz.incStat(key);
    }

    edgeInfoForNodesRelatingToTranslateValues(values = []){
        
        if(!Array.isArray(values)){
            return Promise.reject(new Error("values must be an array"));
        }
        
        if(!values.length){
            return Promise.reject(new Error("values should not be empty"));
        }

        this._incStat("edge_info_nodes_translates");

        values = values.map(val => `${this.yildiz.sequelize.escape(val)}`);

        const edgeTable = `${this.yildiz.prefix}_edges`;
        const nodeTable = `${this.yildiz.prefix}_nodes`;
        const translateTable = `${this.yildiz.prefix}_translates`;
        const firstNode = "left_node_id";
        const secondNode = "right_node_id";

        const query = `SELECT e.${secondNode}, e.relation, e.depth, e.data as edata, t.value, t.data as tdata
            FROM ${edgeTable} e
            INNER JOIN ${nodeTable} n ON e.${secondNode} = n.id
            INNER JOIN ${translateTable} t ON n.identifier = t.identifier
            WHERE e.${firstNode} IN (SELECT * FROM 
            (SELECT id FROM ${nodeTable} WHERE identifier IN ( SELECT * FROM ( 
            SELECT identifier FROM ${translateTable} WHERE value IN 
            ( ${values.join(", ")} ) ) AS inner_sub_query
            )) AS outer_sub_query 
        ) ORDER BY e.depth desc`;

        return this.yildiz.sequelize.query(query, { 
            replacements: {}, 
            type: this.yildiz.sequelize.QueryTypes.SELECT 
        }).then(edges => {
            
            if(!edges || !edges.length){
                return [];
            }

            return edges;
        });
    }

    async upsertSingleEdgeRelationBetweenNodes(body, withTransaction = true){

        if(!body || typeof body !== "object"){
            return Promise.reject(new Error("Body must be an object."));
        }
        
        this._incStat("upsert_relation");
        
        let {
            leftNodeIdentifierVal, 
            rightNodeIdentifierVal, 
            leftNodeData, 
            rightNodeData,
            ttld, 
            relation, 
            edgeData, 
            depthBeforeCreation
        } = body;
        
        const idEdge = generateId();
        const idNode1 = generateId();
        const idNode2 = generateId();
        const identifier1 = this.translator.strToInt(leftNodeIdentifierVal);
        const identifier2 = this.translator.strToInt(rightNodeIdentifierVal);

        if(typeof relation === "string"){
            relation = this.translator.strToInt(relation);
        }

        //procedure without transaction
        if(!withTransaction){
            return this.yildiz.procedureLoader.getProcedure("relationUpsertNoTrans").call(
                idEdge,
                idNode1,
                idNode2,
                identifier1,
                identifier2,
                leftNodeData,
                rightNodeData,
                leftNodeIdentifierVal,
                rightNodeIdentifierVal,
                ttld,
                relation,
                edgeData,
                depthBeforeCreation
            );
        }

        //procedure with transaction
        return this.yildiz.procedureLoader.getProcedure("relationUpsert").call(
            idEdge,
            idNode1,
            idNode2,
            identifier1,
            identifier2,
            leftNodeData,
            rightNodeData,
            leftNodeIdentifierVal,
            rightNodeIdentifierVal,
            ttld,
            relation,
            edgeData,
            depthBeforeCreation
        );
    }
}

module.exports = GraphAccess;