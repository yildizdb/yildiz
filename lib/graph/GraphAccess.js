"use strict";

const Promise = require("bluebird");
const validator = require("validator");

class GraphAccess {

    constructor(krakn){
        this.krakn = krakn;
        this.nodeHandler = this.krakn.getNodeHandler();
        this.translator = this.krakn.getTranslator();
    }

    edgeInfoForNodesRelatingToTranslateValues(values = []){
        
        if(!Array.isArray(values)){
            return Promise.reject(new Error("values must be an array"));
        }
        
        if(!values.length){
            return Promise.reject(new Error("values should not be empty"));
        }

        values = values.map(val => `${this.krakn.sequelize.escape(val)}`);

        const query = `select e.other_node_id, e.relation, e.depth, e.data as edata, t.value, t.data as tdata
            from kca1_edges e
            inner join kca1_nodes n on e.other_node_id = n.id
            inner join kca1_translates t on n.identifier = t.identifier
            where e.kca1_node_id in (select * from (
            (select id from kca1_nodes where identifier in ( select * from ( 
            select identifier from kca1_translates where value in 
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