"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:nodehandler");
const Node = require("./Node");
const {generateId, strToInt} = require("./../../utils");
const ED = "ed";
const EC = "ec";

class NodeHandlerSingle {

    constructor(yildiz, depthHandler = null) {
        this.yildiz = yildiz;
        this.instance = this.yildiz.instance;
        this.metadata = this.yildiz.metadata;
        this.dbConfig = this.yildiz.config.database;
        
        // Tables
        this.nodeTable = this.yildiz.nodeTable;
        this.ttlTable = this.yildiz.ttlTable;

        // Column Families
        this.columnFamilyNode = this.yildiz.columnFamilyNode;
        this.columnFamilyTTL = this.yildiz.columnFamilyTTL;
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

                if (raw[n] && raw[n][0] && raw[n][0].value) {
                    result[n] = this._getParsedValue(raw[n][0].value);
                }
            });
        }
        catch (err) {

            if (!err.message.startsWith("Unknown row")) {
                throw err;
            }

            // Set the result to null if it throws at row.get - Error: Unknown row 
            result = null;
        }

        return result;
    }

    async _updateEdgeOnNode(nodeId, edgeId) {

        const nodeRow = this.nodeTable.row(nodeId + "");
        const rules = [{
            column: `${this.columnFamilyNode.familyName}:edges`,
            append: edgeId + ","
        }];
        
        return await nodeRow.createRules(rules);
    }

    /* ### EDGES ### */

    async edgeExistsId(firstId, secondId, relation = 0) {

        if (isNaN(relation)) {
            relation = strToInt(relation);
        }

        const CFName = this.columnFamilyNode.familyName;

        let resultLeft = [];
        let resultRight = [];
        const result = {
            id: [],
            data: null
        };

        // firstNode
        if (this.dbConfig.leftNodeEdge) {
            try {
                resultLeft = (await this.nodeTable.row(firstId)
                    .get([
                        `${CFName}:${ED}-${secondId}`,
                        `${CFName}:${EC}-${secondId}-${relation}`
                    ]))
                    .filter(result => !!result)
                    .map(result => result[CFName]);

                const key = Object.keys(resultLeft[0])[0];
                result.id.push(key);
                result.data = resultLeft[0][key][0].value;
            } catch (err) {
                debug("unable to get leftNode", err);
            }
        }
        
        // secondNode
        if (this.dbConfig.rightNodeEdge) {
            try {
                resultRight = (await this.nodeTable.row(secondId)
                .get([
                    `${CFName}:${ED}-${firstId}`,
                    `${CFName}:${EC}-${firstId}-${relation}`       
                ]))
                .filter(result => !!result)
                .map(result => result[CFName]);

                const key = Object.keys(resultRight[0])[0];
                result.id.push(key);
                result.data = resultRight[0][key][0].value;
            } catch (err) {
                debug("unable to get rightNode", err);
            }
        }

        return result.id.length ? result : null;
    }


    async createEdgeWithId(fnId, snId, relation = 0, attributes = {}, _extend = {}, ttld = false, depthMode = false) {

        if (!fnId || !snId) {
            throw new Error("missing left or right id params.");
        }

        const requests = [];
        const results = [];
        const relationInt = strToInt(relation);
        
        const val =  JSON.stringify(Object.assign({},_extend,attributes));
        
        if (this.dbConfig.leftNodeEdge) {
            const columnName = `${depthMode ? ED : EC}-${snId}${depthMode ? "" : "-" + relationInt}`;
            const qualifier = `${this.columnFamilyNode.familyName}:${columnName}`;
            const leftNodeId = fnId + "";
            const row = this.nodeTable.row(leftNodeId);
            results.push(qualifier);
            requests.push(depthMode ? row.increment(qualifier) : row.save(qualifier,val));
        }

        if (this.dbConfig.rightNodeEdge) {
            const columnName = `${depthMode ? ED : EC}-${fnId}${depthMode ? "" : "-" + relationInt}`;
            const qualifier = `${this.columnFamilyNode.familyName}:${columnName}`;
            const rightNodeId = snId + "";
            const row = this.nodeTable.row(rightNodeId);
            results.push(qualifier);
            requests.push(depthMode ? row.increment(qualifier) : row.save(qualifier,val));
        }

        this.metadata.increaseCount("edges");
        this._incStat("create_edge_id");

        await Promise.all(requests);

        return results;
    }

    async getEdgesForLeftNode(id, relation = 0){

        this._incStat("get_edges_left");

        return await this.getEdgesforNode(id);
    }

    async getEdgesForRightNode(id, relation = 0){

        this._incStat("get_edges_right");

        return await this.getEdgesforNode(id);
    }

    async getEdgesForBothNode(id, relation = 0){

        this._incStat("get_edges_both");

        return await this.getEdgesforNode(id);
    }

    async getEdgesforNode(id) {

        const results = [];
        const key = id + "";
        const row = await this.nodeTable.row(key).get();
        const CFName = this.columnFamilyNode.familyName;
        const edgesRaw = row[0].data[CFName];
        const edges = [];

        Object.keys(edgesRaw).map(
            edgesRawKey => {
                if (edgesRawKey.startsWith(EC) || edgesRawKey.startsWith(ED)) {
                    edges.push(edgesRaw[edgesRawKey][0].value);
                }
            }
        );

        return edges;
    }

    async getEdgeByQualifier(nodeId, qualifier) {

        const cacheKey = `eei:${qualifier}`;
        const cacheResult = await this.yildiz.cache.getEdge(cacheKey);

        if (cacheResult) {
            return cacheResult;
        }

        if(typeof qualifier !== "string"){
            qualifier = qualifier + "";
        }

        return await this.nodeTable.row(nodeId).get([qualifier]);
    }

    async getEdgeCount() {
        return await this.metadata.getCount("edges");
    }

    async increaseEdgeDepthById(fnId, snId) {

        const requests = [];
        const edges = [];

        if (this.dbConfig.leftNodeEdge) {
            const columnName = `${ED}-${snId}`;
            const qualifier = `${this.columnFamilyNode.familyName}:${columnName}`;
            const leftNodeId = fnId + "";
            const row = this.nodeTable.row(leftNodeId);
            edges.push(qualifier);
            requests.push(row.increment(qualifier));
        }

        if (this.dbConfig.rightNodeEdge) {
            const columnName = `${ED}-${fnId}`;
            const qualifier = `${this.columnFamilyNode.familyName}:${columnName}`;
            const rightNodeId = snId + "";
            const row = this.nodeTable.row(rightNodeId);
            edges.push(qualifier);
            requests.push(row.increment(qualifier));
        }

        try {
            await Promise.all(requests);
        }
        catch (err) {
            debug("Error while saving row" + err);
            return {
                success: false
            };
        }

        return {
            success: true,
            edges
        };
    }

    async decreaseEdgeDepthById(fnId, snId) {

        const requests = [];
        const edges = [];

        if (this.dbConfig.leftNodeEdge) {
            const columnName = `${ED}-${snId}`;
            const qualifier = `${this.columnFamilyNode.familyName}:${columnName}`;
            const leftNodeId = fnId + "";
            const row = this.nodeTable.row(leftNodeId);
            edges.push(qualifier);
            requests.push(row.increment(qualifier, -1));
        }

        if (this.dbConfig.rightNodeEdge) {
            const columnName = `${ED}-${fnId}`;
            const qualifier = `${this.columnFamilyNode.familyName}:${columnName}`;
            const rightNodeId = snId + "";
            const row = this.nodeTable.row(rightNodeId);
            edges.push(qualifier);
            requests.push(row.increment(qualifier, -1));
        }

        try {
            await Promise.all(requests);
        }
        catch (err) {
            debug("Error while saving row" + err);
            return {
                success: false
            };
        }

        return {
            success: true,
            edges
        };
    }

    async removeEdgeByIds(first, second, relation = 0) {

        const edge = await this.edgeExistsId(first, second, relation);

        if (!edge) {
            return null;
        }

        const requests = [];
        const CFName = this.columnFamilyNode.familyName;

        if (this.dbConfig.leftNodeEdge) {

            const key = first + "";
            const row = this.nodeTable.row(key);
            const cells = edge.id
                .filter(edgeId => key !== edgeId.split("-")[1])
                .map(edgeId => `${CFName}:${edgeId}`);
            requests.push(row.deleteCells(cells));
        }


        if (this.dbConfig.rightNodeEdge) {
            
            const key = second + "";
            const row = this.nodeTable.row(key);
            const cells = edge.id
                .filter(edgeId => key !== edgeId.split("-")[1])
                .map(edgeId => `${CFName}:${edgeId}`);
            requests.push(row.deleteCells(cells));
        }

        return await Promise.all(requests);
    }

    /* ### NODES ### */

    async createNode(identifier = generateId(), properties = {}, _extend = {}, ttld = false, identifierValue) {

        const data = Object.assign({}, _extend, properties);
        const ttldVal = ttld + "";
        const key = identifier + "";

        const val = {
            key,
            data: {
                [this.columnFamilyNode.familyName] : {
                    data: JSON.stringify(data),
                    ttld: ttldVal,
                    value: identifierValue
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

module.exports = NodeHandlerSingle;