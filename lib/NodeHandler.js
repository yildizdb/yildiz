"use strict";

const Promise = require("bluebird");
const debug = require("debug")("krakn:nodehandler");

const Node = require("./Node.js");

class NodeHandler {

    constructor(krakn){
        this.krakn = krakn;
        this._node = this.krakn.models.Node;
        debug("created");
    }

    /* ### EDGES ### */

    async edgeExistsViaJoin(firstIdentifier, secondIdentifier, relation = "unknown"){

        const edgeTable = `${this.krakn.prefix}_edges`;
        const nodeTable = `${this.krakn.prefix}_nodes`;
        const firstNode = `${this.krakn.prefix}_node_id`;
        const secondNode = "other_node_id";

        const query = `SELECT e.data 
        FROM ${edgeTable} e 
        INNER JOIN ${nodeTable} n
        ON e.${firstNode} = n.id OR e.${secondNode} = n.id
        WHERE (n.identifier = :first OR n.identifier = :second)
        AND e.relation = :relation`;
        
        return await this.krakn.sequelize.query(query, { 
            replacements: {
                first: firstIdentifier,
                second: secondIdentifier,
                relation
            }, 
            type: this.krakn.sequelize.QueryTypes.SELECT 
        }).then(edges => {
            
            if(!edges || edges.length < 1){
                return null;
            }

            return edges[0];
        });
    }

    async edgeExists(firstIdentifier, secondIdentifier, relation = "unknown"){

        const table = `${this.krakn.prefix}_edges`;

        const firstNode = `${this.krakn.prefix}_node_id`;
        const firstSubquery = `SELECT id FROM ${this.krakn.prefix}_nodes WHERE identifier = :first`;

        const secondNode = "other_node_id";
        const secondSubquery = `SELECT id FROM ${this.krakn.prefix}_nodes WHERE identifier = :second`;

        const query = `SELECT data 
            FROM ${table} 
            WHERE ${firstNode} = (${firstSubquery}) 
            AND ${secondNode} = (${secondSubquery}) 
            AND relation LIKE :relation`;

        return await this.krakn.sequelize.query(query, { 
                replacements: {
                    first: firstIdentifier,
                    second: secondIdentifier,
                    relation
                }, 
                type: this.krakn.sequelize.QueryTypes.SELECT 
            }).then(edges => {
                
                if(!edges || edges.length < 1){
                    return null;
                }

                return edges[0];
            });
    }

    async edgeExistsId(firstId, secondId, relation = "unknown"){

        const cacheKey = `eei:${firstId}:${secondId}:${relation}`;
        const cacheResult = await this.krakn.cache.getEdge(cacheKey);

        if(cacheResult){
            return cacheResult;
        }
        
        const table = `${this.krakn.prefix}_edges`;
        const firstNode = `${this.krakn.prefix}_node_id`;
        const secondNode = "other_node_id";
        const query = `SELECT data 
            FROM ${table} 
            WHERE ${firstNode} = :first 
            AND ${secondNode} = :second 
            AND relation LIKE :relation`;

        return await this.krakn.sequelize.query(query, { 
                replacements: {
                    first: firstId,
                    second: secondId, 
                    relation
                }, 
                type: this.krakn.sequelize.QueryTypes.SELECT 
            }).then(edges => {

                if(!edges || edges.length < 1){
                    return null;
                }

                return this.krakn.cache.setEdge(cacheKey, edges[0]).then(() => {
                    return edges[0];
                });
            });
    }

    async createEdge(firstNode, secondNode, relation = "unknown", attributes = {}, _extend = {}){
        
        if(!firstNode || !secondNode || 
            !(firstNode instanceof Node) || !(secondNode instanceof Node)){
            throw new Error("node parameters must be of type Node.");
        }

        const edgeData = Object.assign(_extend, {
            relation,
            data: attributes
        });

        return await firstNode.self.addOther_node(secondNode.self, { through: edgeData });
    }

    async increaseEdgeDepthById(first, second, relation = "unknown"){
        
        const firstNode = `${this.krakn.prefix}_node_id`;
        const secondNode = "other_node_id";
        const table = `${this.krakn.prefix}_edges`;
        const query = `UPDATE ${table} 
            SET depth = depth + 1 
            WHERE ${firstNode} = :first
            AND ${secondNode} = :second
            AND relation = :relation`;

        return await new Promise(resolve => {
            this.krakn.sequelize.query(query, {
                replacements: {
                    first,
                    second,
                    relation
                }
            }).spread((_, metadata) => {
                resolve(metadata);
            });
        });
    }

    async decreaseEdgeDepthById(first, second, relation = "unknown"){

        const firstNode = `${this.krakn.prefix}_node_id`;
        const secondNode = "other_node_id";
        const table = `${this.krakn.prefix}_edges`;
        const query = `UPDATE ${table} 
            SET depth = depth - 1 
            WHERE ${firstNode} = :first
            AND ${secondNode} = :second
            AND relation = :relation`;

        return await new Promise(resolve => {
            this.krakn.sequelize.query(query, {
                replacements: {
                    first,
                    second,
                    relation
                }
            }).spread((_, metadata) => {
                resolve(metadata);
            });
        });
    }

    async updateEdgeByIds(first, second, relation = "unknown", attributes = {}, _extend = {}, _relation = null){
        
        const sets = [];

        sets.push(`data = '${JSON.stringify(attributes)}'`);
        Object.keys(_extend).forEach(ekey => {
            if(typeof ekey !== "string"){
                sets.push(`${ekey} = ${_extend[ekey]}`);
            } else {
                sets.push(`${ekey} = '${_extend[ekey]}'`);
            }
        });

        //if _relation is set, we ovewrite it
        if(_relation){
            sets.push(`relation = '${_relation}'`);
        }

        const firstNode = `${this.krakn.prefix}_node_id`;
        const secondNode = "other_node_id";
        const table = `${this.krakn.prefix}_edges`;
        const query = `UPDATE ${table}
            SET ${sets.join(", ")}
            WHERE ${firstNode} = :first
            AND ${secondNode} = :second
            AND relation = :relation`;

        return await new Promise(resolve => {
            this.krakn.sequelize.query(query, {
                replacements: {
                    first,
                    second,
                    relation
                }
            }).spread((_, metadata) => {
                resolve(metadata);
            });
        });
    }

    async removeEdgeByIds(first, second, relation = "unknown"){

        const firstNode = `${this.krakn.prefix}_node_id`;
        const secondNode = "other_node_id";
        const table = `${this.krakn.prefix}_edges`;
        const query = `DELETE FROM ${table} 
            WHERE ${firstNode} = :first
            AND ${secondNode} = :second
            AND relation = :relation`;

        return await new Promise(resolve => {
            this.krakn.sequelize.query(query, {
                replacements: {
                    first,
                    second,
                    relation
                }
            }).spread((_, metadata) => {
                resolve(metadata);
            });
        });
    }

    /* ### NODES ### */

    async createNode(identifier = "", properties = {}, _extend = {}){
        
        const nodeData = Object.assign(_extend, {
            identifier,
            data: properties
        });

        const dbNode = await this._node.create(nodeData);
        debug("node created.");
        return new Node(this, dbNode);
    }

    getNodeByIdentifier(identifier){
        return this.getNodeByPropertyField("identifier", identifier);
    }

    getNodesByIdentifier(identifier){
        return this.getNodesByPropertyField("identifier", identifier);
    }

    async getNodeByPropertyField(field, value){

        const cacheKey = `gnbpf:${field}:${value}`;
        const cacheResult = await this.krakn.cache.getNode(cacheKey);

        if(cacheResult){
            return cacheResult;
        }

        const dbNode = await this._node.findOne({
            attributes: { exclude: [`${this.krakn.prefix}_edge`] },
            where: {
                [field]: value
            }
        });

        if(!dbNode){
            return null;
        }
    
        const node = new Node(this, dbNode);
        await this.krakn.cache.setNode(cacheKey, node);
        return node;
    }

    async getNodesByPropertyField(field, value){

        const dbNodes = await this._node.findAll({
            attributes: { exclude: [`${this.krakn.prefix}_edge`] },
            where: {
                [field]: value
            }
        });

        return dbNodes.map(dbNode => new Node(this, dbNode));
    }
}

module.exports = NodeHandler;