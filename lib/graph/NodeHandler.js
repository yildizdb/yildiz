"use strict";

const Promise = require("bluebird");
const debug = require("debug")("krakn:nodehandler");

const Node = require("./Node.js");

class NodeHandler {

    constructor(krakn) {
        this.krakn = krakn;
        this._node = this.krakn.models.Node;
    }

    /* ### EDGES ### */

    async edgeExistsViaJoin(firstIdentifier, secondIdentifier, relation = 0) {

        const edgeTable = `${this.krakn.prefix}_edges`;
        const nodeTable = `${this.krakn.prefix}_nodes`;
        const firstNode = "left_node_id";
        const secondNode = "right_node_id";

        const query = `SELECT e.id, e.data, e.depth, e.ttld, e.created_at 
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

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges[0];
        });
    }

    async edgeExists(firstIdentifier, secondIdentifier, relation = 0) {

        const table = `${this.krakn.prefix}_edges`;

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        
        const firstSubquery = `SELECT id FROM ${this.krakn.prefix}_nodes WHERE identifier = :first`;
        const secondSubquery = `SELECT id FROM ${this.krakn.prefix}_nodes WHERE identifier = :second`;

        const query = `SELECT id, data, depth, ttld, created_at
            FROM ${table} 
            WHERE ${firstNode} = (${firstSubquery}) 
            AND ${secondNode} = (${secondSubquery}) 
            AND relation = :relation`;

        return await this.krakn.sequelize.query(query, {
            replacements: {
                first: firstIdentifier,
                second: secondIdentifier,
                relation
            },
            type: this.krakn.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges[0];
        });
    }

    async edgeExistsId(firstId, secondId, relation = 0) {

        const cacheKey = `eei:${firstId}:${secondId}:${relation}`;
        const cacheResult = await this.krakn.cache.getEdge(cacheKey);

        if (cacheResult) {
            return cacheResult;
        }

        const table = `${this.krakn.prefix}_edges`;
        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        const query = `SELECT id, data, depth, ttld, created_at
            FROM ${table} 
            WHERE ${firstNode} = :first 
            AND ${secondNode} = :second 
            AND relation = :relation`;

        return await this.krakn.sequelize.query(query, {
            replacements: {
                first: firstId,
                second: secondId,
                relation
            },
            type: this.krakn.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return this.krakn.cache.setEdge(cacheKey, edges[0]).then(() => {
                return edges[0];
            });
        });
    }

    async createEdge(firstNode, secondNode, relation = 0, attributes = {}, _extend = {}) {
        throw new Error("createEdge has been removed.");
    }

    async createEdgeWithId(fnId, snId, relation = 0, attributes = {}, _extend = {}, ttld = false) {

        if (!fnId || !snId) {
            throw new Error("missing left or right id params.");
        }

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
        const table = `${this.krakn.prefix}_edges`;

        const edgeData = Object.assign(_extend, {
            [firstNode]: fnId,
            [secondNode]: snId,
            relation,
            ttld,
            data: JSON.stringify(attributes)
        });

        /* //will not add more than one pair
        return await firstNode.self.addOther_node(secondNode.self, {
            through: edgeData
        }); */

        const columns = Object.keys(edgeData).map(c => "`" + c + "`");
        const rcolumns = Object.keys(edgeData).map(c => `:${c}`);
        const query = `INSERT INTO ${table} (${columns.join(", ")}, created_at) VALUES (${rcolumns.join(", ")}, NOW())`;

        return await new Promise(resolve => {
            this.krakn.sequelize.query(query, {
                replacements: edgeData
            }).spread((_, metadata) => {
                debug("edge created.", fnId, snId, relation);
                resolve(metadata);
            });
        });
    }

    async getEdgesForLeftNode(id, relation = 0){
        
        const table = `${this.krakn.prefix}_edges`;
        const query = `SELECT right_node_id, depth, ttld, created_at, data
            FROM ${table} 
            WHERE left_node_id = :left 
            AND relation = :relation`;

        return await this.krakn.sequelize.query(query, {
            replacements: {
                left: id,
                relation
            },
            type: this.krakn.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges;
        });
    }

    async getEdgesForRightNode(id, relation = 0){
        
        const table = `${this.krakn.prefix}_edges`;
        const query = `SELECT left_node_id, depth, ttld, created_at, data
            FROM ${table} 
            WHERE right_node_id = :right
            AND relation = :relation`;

        return await this.krakn.sequelize.query(query, {
            replacements: {
                right: id,
                relation
            },
            type: this.krakn.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges;
        });
    }

    async getEdgesForBothNode(id, relation = 0){
        
        const table = `${this.krakn.prefix}_edges`;
        const query = `SELECT right_node_id, left_node_id, depth, ttld, created_at, data
            FROM ${table} 
            WHERE (right_node_id = :id OR left_node_id = :id)
            AND relation = :relation`;

        return await this.krakn.sequelize.query(query, {
            replacements: {
                id,
                relation
            },
            type: this.krakn.sequelize.QueryTypes.SELECT
        }).then(edges => {

            if (!edges || edges.length < 1) {
                return null;
            }

            return edges;
        });
    }

    async increaseEdgeDepthById(first, second, relation = 0) {

        const cacheKey = `eei:${first}:${second}:${relation}`;
        await this.krakn.cache.del(cacheKey);

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";

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

    async decreaseEdgeDepthById(first, second, relation = 0) {

        const cacheKey = `eei:${first}:${second}:${relation}`;
        await this.krakn.cache.del(cacheKey);

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
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

    async updateEdgeByIds(first, second, relation = 0, attributes = {}, _extend = {}, _relation = null) {

        const cacheKey = `eei:${first}:${second}:${relation}`;
        await this.krakn.cache.del(cacheKey);

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

    async removeEdgeByIds(first, second, relation = 0) {

        const cacheKey = `eei:${first}:${second}:${relation}`;
        await this.krakn.cache.del(cacheKey);

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";
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

    async createNode(identifier = "", properties = {}, _extend = {}, ttld = false) {

        const nodeData = Object.assign(_extend, {
            identifier,
            data: properties,
            ttld
        });

        const dbNode = await this._node.create(nodeData);
        debug("node created.", identifier);
        return new Node(this, dbNode);
    }

    async removeNode(identifier) {

        const cacheKey = `gnbpf:identifier:${identifier}`;
        await this.krakn.cache.del(cacheKey);

        const table = `${this.krakn.prefix}_nodes`;
        const query = `DELETE FROM ${table} WHERE identifier = :identifier`;

        return await new Promise(resolve => {
            this.krakn.sequelize.query(query, {
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
        const cacheResult = await this.krakn.cache.getNode(cacheKey);

        if (cacheResult) {
            return cacheResult;
        }

        const dbNode = await this._node.findOne({
            attributes: {
                exclude: [`${this.krakn.prefix}_edge`]
            },
            where: {
                [field]: value
            }
        });

        if (!dbNode) {
            return null;
        }

        const node = new Node(this, dbNode);
        await this.krakn.cache.setNode(cacheKey, node);
        return node;
    }

    async getNodesByPropertyField(field, value) {

        const dbNodes = await this._node.findAll({
            attributes: {
                exclude: [`${this.krakn.prefix}_edge`]
            },
            where: {
                [field]: value
            }
        });

        return dbNodes.map(dbNode => new Node(this, dbNode));
    }
}

module.exports = NodeHandler;