"use strict";

const Promise = require("bluebird");
const validator = require("validator");

class GraphAccess {

    constructor(krakn){
        this.krakn = krakn;
        this.nodeHandler = this.krakn.getNodeHandler();
        this.translator = this.krakn.getTranslator();
    }

    _incStat(key){
        return this.krakn.incStat(key);
    }

    edgeInfoForNodesRelatingToTranslateValues(values = []){
        
        if(!Array.isArray(values)){
            return Promise.reject(new Error("values must be an array"));
        }
        
        if(!values.length){
            return Promise.reject(new Error("values should not be empty"));
        }

        this._incStat("edge_info_nodes_translates");

        values = values.map(val => `${this.krakn.sequelize.escape(val)}`);

        const edgeTable = `${this.krakn.prefix}_edges`;
        const nodeTable = `${this.krakn.prefix}_nodes`;
        const translateTable = `${this.krakn.prefix}_translates`;
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

        return this.krakn.sequelize.query(query, { 
            replacements: {}, 
            type: this.krakn.sequelize.QueryTypes.SELECT 
        }).then(edges => {
            
            if(!edges || !edges.length){
                return [];
            }

            return edges;
        });
    }
}

module.exports = GraphAccess;