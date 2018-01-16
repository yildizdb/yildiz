"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:nodehandler");
const {generateId} = require("../utils");

const Node = require("./Node.js");

class NodeHandler {

    constructor(yildiz, depthHandler = null) {
        this.yildiz = yildiz;
        this._node = this.yildiz.models.Node;
        this.depthHandler = depthHandler;
    }

    _incStat(key){
        return this.yildiz.incStat(key);
    }

    /* ### EDGES ### */

    async edgeExistsViaJoin(firstIdentifier, secondIdentifier, relation = 0) {

        const edgeTable = `${this.yildiz.prefix}_edges`;
        const nodeTable = `${this.yildiz.prefix}_nodes`;
        const firstNode = "left_node_id";
        const secondNode = "right_node_id";

        const query = `SELECT e.id, e.data, e.depth, e.ttld, e.created_at 
        FROM ${edgeTable} e 
        INNER JOIN ${nodeTable} n
        ON e.${firstNode} = n.id OR e.${secondNode} = n.id
        WHERE (n.identifier = :first OR n.identifier = :second)
        AND e.relation = :relation`;

        this._incStat("edge_exists_join");

        return await this.yildiz.sequelize.query(query, {
            replacements: {
                first: firstIdentifier,
                second: secondIdentifier,
                relation
            },
            type: this.yildiz.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges[0];
        });
    }

    async edgeExists(firstIdentifier, secondIdentifier, relation = 0) {

        const table = `${this.yildiz.prefix}_edges`;

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        
        const firstSubquery = `SELECT id FROM ${this.yildiz.prefix}_nodes WHERE identifier = :first`;
        const secondSubquery = `SELECT id FROM ${this.yildiz.prefix}_nodes WHERE identifier = :second`;

        const query = `SELECT id, data, depth, ttld, created_at
            FROM ${table} 
            WHERE ${firstNode} = (${firstSubquery}) 
            AND ${secondNode} = (${secondSubquery}) 
            AND relation = :relation`;

        this._incStat("edge_exists");

        return await this.yildiz.sequelize.query(query, {
            replacements: {
                first: firstIdentifier,
                second: secondIdentifier,
                relation
            },
            type: this.yildiz.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges[0];
        });
    }

    async edgeExistsId(firstId, secondId, relation = 0) {

        const cacheKey = `eei:${firstId}:${secondId}:${relation}`;
        const cacheResult = await this.yildiz.cache.getEdge(cacheKey);

        if (cacheResult) {
            return cacheResult;
        }

        const table = `${this.yildiz.prefix}_edges`;
        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        const query = `SELECT id, data, depth, ttld, created_at
            FROM ${table} 
            WHERE ${firstNode} = :first 
            AND ${secondNode} = :second 
            AND relation = :relation`;

            this._incStat("edge_exists_id");

        return await this.yildiz.sequelize.query(query, {
            replacements: {
                first: firstId,
                second: secondId,
                relation
            },
            type: this.yildiz.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return this.yildiz.cache.setEdge(cacheKey, edges[0]).then(() => {
                return edges[0];
            });
        });
    }

    async createEdge(firstNode, secondNode, relation = 0, attributes = {}, _extend = {}) {
        throw new Error("createEdge has been removed.");
    }

    async createEdgeWithId(fnId, snId, relation = 0, attributes = {}, _extend = {}, ttld = false, id) {

        if (!fnId || !snId) {
            throw new Error("missing left or right id params.");
        }

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        const table = `${this.yildiz.prefix}_edges`;
        const intId = (typeof id === "number") && (id % 1  === 0) && id; 

        const edgeData = Object.assign(_extend, {
            id: intId || generateId(),
            [firstNode]: fnId,
            [secondNode]: snId,
            relation,
            ttld,
            depth: 1,
            data: JSON.stringify(attributes)
        });

        /* //will not add more than one pair
        return await firstNode.self.addOther_node(secondNode.self, {
            through: edgeData
        }); */

        const rcolumns = Object.keys(edgeData).map(c => `:${c}`);
        const columns = Object.keys(edgeData).map(c => 
            this.yildiz.config.database.dialect === "mysql" ? "`" + c + "`": `"${c}"`
        );
        const query = `INSERT INTO ${table} (${columns.join(", ")}, created_at) VALUES (${rcolumns.join(", ")}, NOW())`;
        
        this._incStat("create_edge_id");
        
        return await new Promise(resolve => {
            this.yildiz.sequelize.query(query, {
                replacements: edgeData
            }).spread((_, metadata) => {
                debug("edge created.", fnId, snId, relation);
                resolve(metadata);
            });
        });
    }

    async getEdgesForLeftNode(id, relation = 0){
        
        const table = `${this.yildiz.prefix}_edges`;
        const query = `SELECT right_node_id, depth, ttld, created_at, data
            FROM ${table} 
            WHERE left_node_id = :left 
            AND relation = :relation`;

        this._incStat("get_edges_left");

        return await this.yildiz.sequelize.query(query, {
            replacements: {
                left: id,
                relation
            },
            type: this.yildiz.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges;
        });
    }

    async getEdgesForRightNode(id, relation = 0){
        
        const table = `${this.yildiz.prefix}_edges`;
        const query = `SELECT left_node_id, depth, ttld, created_at, data
            FROM ${table} 
            WHERE right_node_id = :right
            AND relation = :relation`;
        
        this._incStat("get_edges_right");

        return await this.yildiz.sequelize.query(query, {
            replacements: {
                right: id,
                relation
            },
            type: this.yildiz.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges;
        });
    }

    async getEdgesForBothNode(id, relation = 0){
        
        const table = `${this.yildiz.prefix}_edges`;
        const query = `SELECT right_node_id, left_node_id, depth, ttld, created_at, data
            FROM ${table} 
            WHERE (right_node_id = :id OR left_node_id = :id)
            AND relation = :relation`;

        this._incStat("get_edges_both");

        return await this.yildiz.sequelize.query(query, {
            replacements: {
                id,
                relation
            },
            type: this.yildiz.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges;
        });
    }

    async increaseEdgeDepthById(first, second, relation = 0) {

        //cache-key will be deleted, when depth walker is executed

        if(!this.depthHandler){
            debug("depthHandler is not ready on nodeHandler.");
            return {
                success: false
            }; 
        }

        this._incStat("inc_edge_depth");

        const edge = await this.edgeExistsId(first, second, relation);

        if(!edge || isNaN(edge.id)){
            debug("No edge id found, cannot increase depth.");
            return {
                success: false
            };
        }

        await this.depthHandler.increaseDepthCount(parseInt(edge.id));
        
        return {
            success: true
        };
    }

    async decreaseEdgeDepthById(first, second, relation = 0) {

        if(!this.depthHandler){
            debug("depthHandler is not ready on nodeHandler.");
            return {
                success: false
            };
        }

        this._incStat("dec_edge_depth");

        const edge = await this.edgeExistsId(first, second, relation);
        
        if(!edge && typeof edge.id !== "number"){
            debug("No edge id found, cannot decrease depth.");
            return {
                success: false
            };
        }

        //remove cache entry after request (or it will be recreated on the same call)
        const cacheKey = `eei:${first}:${second}:${relation}`;
        await this.yildiz.cache.del(cacheKey);

        await this.depthHandler.decreaseDepthCount(edge.id);
        
        return {
            success: true
        };
    }

    async updateEdgeByIds(first, second, relation = 0, attributes = {}, _extend = {}, _relation = null) {

        const cacheKey = `eei:${first}:${second}:${relation}`;
        await this.yildiz.cache.del(cacheKey);

        const sets = [];

        sets.push(`data = '${JSON.stringify(attributes)}'`);
        Object.keys(_extend).forEach(ekey => {
            if (typeof ekey !== "string") {
                sets.push(`${ekey} = ${_extend[ekey]}`);
            } else {
                sets.push(`${ekey} = '${_extend[ekey]}'`);
            }
        });

        //if _relation is set, we ovewrite it
        if (_relation) {
            sets.push(`relation = '${_relation}'`);
        }

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        const table = `${this.yildiz.prefix}_edges`;
        const query = `UPDATE ${table}
            SET ${sets.join(", ")}
            WHERE ${firstNode} = :first
            AND ${secondNode} = :second
            AND relation = :relation`;

        this._incStat("update_edge_id");

        return await new Promise(resolve => {
            this.yildiz.sequelize.query(query, {
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

    async removeEdgeByIds(first, second, relation = 0) {

        const cacheKey = `eei:${first}:${second}:${relation}`;
        await this.yildiz.cache.del(cacheKey);

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        const table = `${this.yildiz.prefix}_edges`;
        const query = `DELETE FROM ${table} 
            WHERE ${firstNode} = :first
            AND ${secondNode} = :second
            AND relation = :relation`;

        this._incStat("remove_edge_id");

        return await new Promise(resolve => {
            this.yildiz.sequelize.query(query, {
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

    async createNode(identifier = "", properties = {}, _extend = {}, ttld = false, id) {

        const intId = (typeof id === "number") && (id % 1  === 0) && id; 

        const nodeData = Object.assign(_extend, {
            id: intId || generateId(),
            identifier,
            data: properties,
            ttld
        });

        this._incStat("create_node");
        return await this._node.create(nodeData).then(result => {
            debug("node created.", identifier);
            return new Node(this, result);
        });
    }

    async removeNode(identifier) {

        const cacheKey = `gnbpf:identifier:${identifier}`;
        await this.yildiz.cache.del(cacheKey);

        const table = `${this.yildiz.prefix}_nodes`;
        const query = `DELETE FROM ${table} WHERE identifier = :identifier`;

        this._incStat("remove_node");

        return await new Promise(resolve => {
            this.yildiz.sequelize.query(query, {
                replacements: {
                    identifier
                }
            }).spread((_, metadata) => {
                resolve(metadata);
            });
        });
    }

    getNodeByIdentifier(identifier) {
        return this.getNodeByPropertyField("identifier", identifier);
    }

    getNodesByIdentifier(identifier) {
        return this.getNodesByPropertyField("identifier", identifier);
    }

    async getNodeByPropertyField(field, value) {

        const cacheKey = `gnbpf:${field}:${value}`;
        const cacheResult = await this.yildiz.cache.getNode(cacheKey);

        if (cacheResult) {
            return cacheResult;
        }

        this._incStat("get_node_" + field);

        const dbNode = await this._node.findOne({
            attributes: {
                exclude: [`${this.yildiz.prefix}_edge`]
            },
            where: {
                [field]: value
            }
        });

        if (!dbNode) {
            return null;
        }

        const node = new Node(this, dbNode);
        await this.yildiz.cache.setNode(cacheKey, node);
        return node;
    }

    async getNodesByPropertyField(field, value) {

        this._incStat("get_nodes_" + field);

        const dbNodes = await this._node.findAll({
            attributes: {
                exclude: [`${this.yildiz.prefix}_edge`]
            },
            where: {
                [field]: value
            }
        });

        return dbNodes.map(dbNode => new Node(this, dbNode));
    }
}

module.exports = NodeHandler;