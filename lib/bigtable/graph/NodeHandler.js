"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:nodehandler");
const Node = require("./Node");
const {generateId, strToInt} = require("./../../utils");

class NodeHandler {

    constructor(yildiz, depthHandler = null) {
        this.yildiz = yildiz;
        this.instance = this.yildiz.instance;
        this.metadata = this.yildiz.metadata;
        
        // Tables
        this.nodeTable = this.yildiz.nodeTable;
        this.edgeTable = this.yildiz.edgeTable;
        this.translateTable = this.yildiz && this.yildiz.translateTable;
        this.ttlTable = this.yildiz.ttlTable;

        // Column Families
        this.columnFamilyEdge = this.yildiz.columnFamilyEdge;
        this.columnFamilyNode = this.yildiz.columnFamilyNode;
        this.columnFamilyTranslate = this.yildiz.columnFamilyTranslate;
        this.columnFamilyTTL = this.yildiz.columnFamilyTTL;
        
        // TODO: Other, might be refactored
        this._node = null;
        this.depthHandler = depthHandler;
    }

    _incStat(key){
        return this.yildiz.incStat(key);
    }

    _getParsedValue(value) {

        let result = value;

        try {
            result = JSON.parse(value);
        }
        catch(err) {
            // DO Nothing
         }

        return result;
    }

    async _getRow(identifier, table, CFName) {

        let result = {identifier, id: identifier};
        const row = table.row(identifier+"");

        try {
            const rowGet = await row.get();
            const raw = rowGet && rowGet[0] && rowGet[0].data && rowGet[0].data[CFName];
            Object.keys(raw).forEach(n => {
                result[n] = this._getParsedValue(raw[n][0].value);
            });
        }
        catch (err) {
            result = null;
        }

        return result;
    }

    async _updateEdgeOnNode(nodeId, edgeId) {

        const nodeRow = this.nodeTable.row(nodeId + "");

        let edges = null;
        let rawData = null;
        
        // Check if node exists, create node from scratch
        try {
            const rowGet = await nodeRow.get();
            rawData = rowGet[0].data[this.columnFamilyNode.familyName];
        }
        catch(err) {
            await this.createNode(null, {}, {}, null, null, edgeId);
        }

        // Check if edges exists, simply add the column
        try {
            edges = rawData.edges[0].value;
        }
        catch (err) {
            return await nodeRow.create({
                [this.columnFamilyNode.familyName]: {
                    edges: edgeId + ","
                }
            });
        }

        if(!edges) {
            return;
        }

        return await nodeRow.save(
            `${this.columnFamilyNode.familyName}:edges`, 
            edges + edgeId + ","
        );
    }

    /* ### EDGES ### */

    async edgeExistsId(firstId, secondId, relation = 0) {

        const cacheKey = `eei:${firstId}:${secondId}:${relation}`;
        const cacheResult = await this.yildiz.cache.getEdge(cacheKey);

        if (cacheResult) {
            return cacheResult;
        }

        return new Promise((resolve, reject) => {

            let idFound = null;

            this.edgeTable.createReadStream({
                filter: [{
                    column: "both_node_id"
                }, {
                    value: firstId + "-" + secondId
                }]
            })
            .on("error", err => {
                reject(err);
            })
            .on("data", async n => {
                idFound = n.id;
            })
            .on("end", async () => {
                let result = null;

                if (idFound) {
                    result = await this._getRow(idFound, this.edgeTable, this.columnFamilyEdge.familyName);
                }

                await this.yildiz.cache.setEdge(cacheKey, result);

                resolve(result);
            });
        });
    }


    async createEdgeWithId(fnId, snId, relation = 0, attributes = {}, _extend = {}, ttld = false, id) {

        if (!fnId || !snId) {
            throw new Error("missing left or right id params.");
        }

        const relationInt = strToInt(relation);
        const key = strToInt(fnId + "_" + snId + "_" + relationInt) + "";
        const data = Object.assign(_extend || {},attributes || {});
        const relationVal = relation + "";
        const ttldVal = ttld + "";
        const val = {
            key,
            data: { 
                [this.columnFamilyEdge.familyName] : {
                    depth: "1",
                    left_node_id: fnId + "",
                    right_node_id: snId + "",
                    both_node_id: fnId + "-" + snId,
                    data: JSON.stringify(data),
                    ttld: ttldVal,
                    relation: relationVal
                }
            }
        };
        const valTTL = {
            key: key + "-edges",
            data: {
                [this.columnFamilyTTL.familyName] : {
                    value: "1"
                }
            }
        };

        const requests = [this.edgeTable.insert([val])];

        // update edges on both nodes left and right
        requests.push(this._updateEdgeOnNode(fnId, key));
        requests.push(this._updateEdgeOnNode(snId, key));

        if (ttld) {
            requests.push(this.ttlTable.insert([valTTL]));
        }

        this._incStat("create_edge_id");
        this.metadata.increaseCount("edges");

        await Promise.all(requests);

        return key;
    }

    async getEdgesForLeftNode(id, relation = 0){

        this._incStat("get_edges_left");
        const results = [];

        return new Promise((resolve, reject) => {

            this.edgeTable.createReadStream({
                filter: [{
                    column: "left_node_id"
                }, {
                    value: id + ""
                }]
            })
            .on("error", err => {
                reject(err);
            })
            .on("data", n => {
                results.push({id: n.id});
            })
            .on("end", n => {
                resolve(results);
            });
        });
    }

    async getEdgesForRightNode(id, relation = 0){
        
        this._incStat("get_edges_right");
        const results = [];

        return new Promise((resolve, reject) => {

            this.edgeTable.createReadStream({
                filter: [{
                    column: "right_node_id"
                }, {
                    value: id + ""
                }]
            })
            .on("error", err => {
                reject(err);
            })
            .on("data", n => {
                results.push({id: n.id});
            })
            .on("end", n => {
                resolve(results);
            });
        });
    }

    async getEdgesForBothNode(id, relation = 0){
        
        this._incStat("get_edges_both");

        const results = [];

        return new Promise((resolve, reject) => {

            this.edgeTable.createReadStream({
                filter: [{
                    column: "both_node_id"
                }, {
                    value: new RegExp(`.*${id}.*$`)
                }]
            })
            .on("error", err => {
                reject(err);
            })
            .on("data",  n => {
                results.push({id: n.id});
            })
            .on("end", n => {
                resolve(results);
            });
        });

    }

    async getEdgeByIdentifier(identifier) {

        if(typeof identifier !== "string"){
            identifier = identifier + "";
        }

        return await this._getRow(identifier, this.edgeTable, this.columnFamilyEdge.familyName)
    }

    async getEdgeCount() {
        return await this.metadata.getCount("edges");
    }

    async increaseEdgeDepthById(first, second, relation = 0) {

        const edge = await this.edgeExistsId(first, second);
        const row = this.edgeTable.row(edge.id);

        try {
            await row.get();
        }
        catch (err) {
            debug("Error while getting row" + err);
            return {
                success: false
            };
        }

        await row.save(
            `${this.columnFamilyEdge.familyName}:depth`, 
            parseInt(edge.depth) + 1 + ""
        );
        
        return {
            success: true
        };
    }

    async increaseEdgeDepthByEdgeId(edgeId, relation = 0) {

        const edge = await this.getEdgeByIdentifier(edgeId);
        const row = this.edgeTable.row(edgeId);

        await row.save(
            `${this.columnFamilyEdge.familyName}:depth`, 
            parseInt(edge.depth) + 1 + ""
        );
        
        return {
            success: true
        };
    }

    async decreaseEdgeDepthById(first, second, relation = 0) {

        const edge = await this.edgeExistsId(first, second);
        const row = this.edgeTable.row(edge.id);

        if (edge.depth === "1") {
            return {
                success: false
            };
        }

        try {
            await row.get();
        }
        catch (err) {
            debug("Error while getting row" + err);
            return {
                success: false
            };
        }

        await row.save(
            `${this.columnFamilyEdge.familyName}:depth`, 
            parseInt(edge.depth) + 1 + ""
        );
        
        return {
            success: true
        };
    }

    async removeEdgeByIds(first, second, relation = 0) {

        const cacheKey = `eei:${first}:${second}:${relation}`;
        await this.yildiz.cache.del(cacheKey);
        this._incStat("remove_edge_id");

        return new Promise((resolve, reject) => {

            let idFound = null;

            this.edgeTable.createReadStream({
                filter: [{
                    column: "both_node_id"
                }, {
                    value: first + "-" + second
                }]
            })
            .on("error", err => {
                reject(err);
            })
            .on("data", async n => {
                idFound = n.id;
            })
            .on("end", async () => {
            
                if (!idFound) {
                    return resolve(null);
                }

                const row = this.edgeTable.row(idFound);
            
                try {
                    await row.get();
                }
                catch (err) {
                    resolve(null);
                }

                this.metadata.decreaseCount("edges");

                resolve(await row.delete());
            });
        });
    }

    async removeEdge(identifier) {

        const row = this.edgeTable.row(identifier+"");

        try {
            await row.get();
        }
        catch (err) {
            return null;
        }

        return await row.delete();
    }

    /* ### NODES ### */

    async createNode(identifier = generateId(), properties = {}, _extend = {}, ttld = false, id, edge) {

        const data = Object.assign(_extend,properties);
        const ttldVal = ttld + "";
        const key = identifier + "";
        const val = {
            key,
            data: {
                [this.columnFamilyNode.familyName] : {
                    data: JSON.stringify({data}),
                    ttld: ttldVal
                }
            }
        };
        const valTTL = {
            key: key + "-nodes",
            data: {
                [this.columnFamilyTTL.familyName] : {
                    value: "1"
                }
            }
        };

        if (edge) {
            val.data[this.columnFamilyNode.familyName].edges = edge + ",";
        }

        const requests = [this.nodeTable.insert([val])];
        if (ttld) {
            requests.push(this.ttlTable.insert([valTTL]));
        }

        this._incStat("create_node");

        
        try {
            await Promise.all(requests);
        }
        catch(err) {
            return new Node(null, err);
        }

        const result = (await this.getNodeByIdentifier(key, true)).getFull();

        this.metadata.increaseCount("nodes");
        return new Node(null, result);
    }

    async removeNode(identifier) {

        const cacheKey = `gnbpf:identifier:${identifier}`;
        await this.yildiz.cache.del(cacheKey);

        const row = this.nodeTable.row(identifier+"");

        try {
            await row.get();
        }
        catch (err) {
            return null;
        }

        this.metadata.decreaseCount("nodes");

        return await row.delete();
    }

    async getNodeByIdentifier(identifier, forced = false) {

        const cacheKey = `gnbpf:identifier:${identifier}`;
        const cacheResult = await this.yildiz.cache.getNode(cacheKey);

        if (cacheResult && !forced) {
            return cacheResult;
        }

        const result = await this._getRow(identifier, this.nodeTable, this.columnFamilyNode.familyName);
        const node = new Node(null, result);

        await this.yildiz.cache.setNode(cacheKey, node);
        return node;
    }

    async getNodeCount() {
        return await this.metadata.getCount("nodes");
    }

}

module.exports = NodeHandler;