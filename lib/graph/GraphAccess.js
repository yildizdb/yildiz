"use strict";

const Promise = require("bluebird");
const validator = require("validator");

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

        const query = `select e.${secondNode}, e.relation, e.depth, e.data as edata, t.value, t.data as tdata
            from ${edgeTable} e
            inner join ${nodeTable} n on e.${secondNode} = n.id
            inner join ${translateTable} t on n.identifier = t.identifier
            where e.${firstNode} in (select * from (
            (select id from ${nodeTable} where identifier in ( select * from ( 
            select identifier from ${translateTable} where value in 
            ( ${values.join(", ")} ) ) AS inner_sub_query
            )) AS outer_sub_query )
        ) order by e.depth desc`;

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

    async upsertSingleEdgeRelationBetweenNodes(body, withTransaction = false){

        if(!body || typeof body !== "object"){
            return Promise.reject(new Error("Body must be an object."));
        }

        this._incStat("upsert_relation");

        const {
            leftNodeIdentifierVal, 
            rightNodeIdentifierVal, 
            leftNodeData, 
            rightNodeData,
            ttld, 
            relation, 
            edgeData, 
            depthBeforeCreation
        } = body;
        
        const identifier1 = this.translator.strToInt(leftNodeIdentifierVal);
        const identifier2 = this.translator.strToInt(rightNodeIdentifierVal);

        //procedure without transaction
        if(!withTransaction){
            return this.yildiz.procedureLoader.stored.relationUpsertNoTrans.call(
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
        return this.yildiz.procedureLoader.stored.relationUpsert.call(
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