"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:nodehandler");

const {generateId, strToInt} = require("./../../utils");

const ED = "ed";
const EC = "ec";

class NodeHandlerSingle {

    constructor(yildiz, depthHandler = null) {
        this.yildiz = yildiz;
        this.instance = this.yildiz.instance;
        this.metadata = this.yildiz.metadata;
        this.metrics = this.yildiz.metrics;
        this.dbConfig = this.yildiz.config.database;

        // Get the Tables and CFs
        const {
            nodeTable,
            ttlTable,
            popnodeTable,
            cacheTable,
            columnFamilyNode,
            columnFamilyTTL,
            columnFamilyPopnode,
            columnFamilyCache
        } = this.yildiz.models;
        
        // Tables
        this.nodeTable = nodeTable;
        this.ttlTable = ttlTable;
        this.popnodeTable = popnodeTable;
        this.cacheTable = cacheTable;

        // Column Families
        this.columnFamilyNode = columnFamilyNode;
        this.columnFamilyTTL = columnFamilyTTL;
        this.columnFamilyPopnode = columnFamilyPopnode;
        this.columnFamilyCache = columnFamilyCache;
    }

    _getParsedValue(value) {

        let result = value;

        try {
            result = JSON.parse(value);
        } catch(error) {
            // DO Nothing
        }

        return result;
    }

    async _getRow(identifier, table, CFName) {

        let result = {identifier, id: identifier};
        const row = table.row(identifier+"");
        let rowGet = null;

        try {
            rowGet = await row.get();
        } catch (error) {

            if (!error.message.startsWith("Unknown row")) {
                throw error;
            }

            // Set the result to null if it throws at row.get - Error: Unknown row 
            result = null;
            return result;
        }

        if (
            rowGet && 
            rowGet[0] && 
            rowGet[0].data && 
            rowGet[0].data[CFName]
        ) {
            const row = rowGet[0].data[CFName];
            Object.keys(row).forEach(column => {
                if (row[column] && row[column][0] && row[column][0].value) {
                    result[column] = this._getParsedValue(row[column][0].value);
                }
            });
        }

        return result;
    }

    async _updateEdgeOnNode(nodeId, edgeId) {

        const nodeRow = this.nodeTable.row(nodeId + "");
        const rules = [{
            column: `${this.columnFamilyNode.id}:edges`,
            append: edgeId + ","
        }];
        
        return await nodeRow.createRules(rules);
    }

    /* ### EDGES ### */

    async edgeExistsId(firstId, secondId, relation = 0) {

        if (!firstId || !secondId) {
            throw new Error("missing left or right id params.");
        }

        if (relation === null) {
            throw new Error("relation can not be null");
        }

        if (isNaN(relation)) {
            relation = strToInt(relation);
        }

        const cacheKey = `gnbpf:identifier:${firstId}:${secondId}:${relation}`;
        const cacheResult = await this.yildiz.cache.getEdge(cacheKey);
        
        if (cacheResult) {
            return cacheResult;
        }

        const start = Date.now();

        const CFName = this.columnFamilyNode.id;

        let resultLeft = [];
        let resultRight = [];
        const result = {
            id: [],
            data: {}
        };

        // firstNode
        if (this.dbConfig.leftNodeEdge) {
            try {
                resultLeft = (await this.nodeTable.row(firstId + "")
                    .get([
                        `${CFName}:${ED}#${secondId}`,
                        `${CFName}:${EC}#${secondId}#${relation}`
                    ]))
                    .filter(result => !!result)
                    .map(result => result[CFName]);

                const key = Object.keys(resultLeft[0])[0];
                result.id.push(key);
                result.data[key] = resultLeft[0][key][0].value;
            } catch (error) {
                if (!error.message.startsWith("Unknown row")) {
                    debug("unable to get leftNode", error);
                }
            }
        }
        
        // secondNode
        if (this.dbConfig.rightNodeEdge) {
            try {
                resultRight = (await this.nodeTable.row(secondId + "")
                .get([
                    `${CFName}:${ED}#${firstId}`,
                    `${CFName}:${EC}#${firstId}#${relation}`       
                ]))
                .filter(result => !!result)
                .map(result => result[CFName]);

                const key = Object.keys(resultRight[0])[0];
                result.id.push(key);
                result.data[key] = resultRight[0][key][0].value;
            } catch (error) {
                if (!error.message.startsWith("Unknown row")) {
                    debug("unable to get leftNode", error);
                }            }
        }

        if (!result.id.length) {
            return null;
        }

        await this.yildiz.cache.setEdge(cacheKey, result);

        this.yildiz.metrics.set("check_exists_edge", Date.now() - start);

        return result;
    }


    async createEdgeWithId(fnId, snId, relation = 0, attributes = {}, _extend = {}, ttld = false, depthMode = false, isPopularRightNode = false, edgeTime = null) {

        if (!fnId || !snId) {
            throw new Error("missing left or right id params.");
        }

        if (relation === null) {
            throw new Error("relation can not be null");
        }

        if (isNaN(relation)) {
            relation = strToInt(relation);
        }

        if (isNaN(fnId)) {
            fnId = strToInt(fnId);
        }

        if (isNaN(snId)) {
            snId = strToInt(snId);
        }

        const requests = [];
        const results = [];
        
        const val =  JSON.stringify(Object.assign({},_extend,attributes));

        if (this.dbConfig.leftNodeEdge) {

            // columnName is just like in the edge creation of rightNode, but the column identifier is reverse
            const columnName = `${depthMode ? ED : EC}#${snId}${depthMode ? "" : "#" + relation}`;
            const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
            const leftNodeId = fnId + "";
            const row = this.nodeTable.row(leftNodeId);
            const saveData = {
                [this.columnFamilyNode.id]: {
                    [columnName]: val
                }
            };

            results.push(qualifier);
            requests.push(depthMode ? row.increment(qualifier) : row.save(saveData));
        
            // Delete cache on left node if exists
            requests.push(this.yildiz.cache.del(`gnbpf:identifier:${fnId}`));
            this.metrics.inc("edge_created_leftNode");

            if (ttld) {
                requests.push(this.ttlTable.insert([{
                    key: `${fnId}-${columnName}_edges`,
                    data: {
                        [this.columnFamilyTTL.id] : {
                            value: "1"
                        }
                    }
                }]));
            }
        }

        if (this.dbConfig.rightNodeEdge) {

           //TODO: if popularRightEdge mode treat differently (currently just dont write it to db)
            if (!isPopularRightNode) {

                // If it is depthMode the columnName will be like ED#12345 where 12345 is the id (murmurhash) of left id
                // If it is NOT depthmode the columnName will be like EC#12345#456 
                // where 12345 is the id (murmurhash) of left id and 456 is the id (murmurhash) of relation 
                const columnName = `${depthMode ? ED : EC}#${fnId}${depthMode ? "" : "#" + relation}`;
                const rightNodeId = snId + "";
                const row = this.nodeTable.row(rightNodeId);
                const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
                const saveData = {
                    [this.columnFamilyNode.id]: {
                        [columnName]: val
                    }
                };

                results.push(qualifier);
                requests.push(depthMode ? row.increment(qualifier) : row.save(saveData));

                // Delete cache on right node if exists
                requests.push(this.yildiz.cache.del(`gnbpf:identifier:${snId}`));

                if (ttld) {
                    requests.push(this.ttlTable.insert([{
                        key: `${snId}-${columnName}_edges`,
                        data: {
                            [this.columnFamilyTTL.id] : {
                                value: "1"
                            }
                        }
                    }]));
                }
            }
            // Save popularnode edge data in separate table
            else {

                edgeTime = edgeTime || Date.now();

                const key = `${fnId}#${snId}${depthMode ? "" : "#" + relation}`;
                const row = this.popnodeTable.row(key);
                const column = depthMode ? "depth" : "data";

                // if depthmode, we need to call increment and save the edgeTime with two calls
                if (depthMode) {
                    const qualifierData = `${this.columnFamilyPopnode.id}:${column}`;
                    requests.push(row.increment(qualifierData));

                    const saveData = {
                        [this.columnFamilyPopnode.id]: {
                            edgeTime
                        }
                    }
                    requests.push(row.save(saveData));
                
                // otherwise we just need to run insertion for both columns
                } else {
                    requests.push(this.popnodeTable.insert([{
                        key,
                        data: {
                            [this.columnFamilyPopnode.id] : {
                                [column]: val,
                                edgeTime
                            }
                        }
                    }]));
                }
                

                if (ttld) {
                    requests.push(this.ttlTable.insert([{
                        key: key + "_popnodes",
                        data: {
                            [this.columnFamilyTTL.id] : {
                                value: "1"
                            }
                        }
                    }]));
                }
            }
            this.metrics.inc("edge_created_rightNode");
        }

        this.metrics.inc("edge_created");
        this.metadata.increaseCount("edges");
        await Promise.all(requests);

       

        return results;
    }

    async getEdgesForLeftNode(id, relation = 0){

        return await this.getEdgesforNode(id);
    }

    async getEdgesForRightNode(id, relation = 0){

        return await this.getEdgesforNode(id);
    }

    async getEdgesForBothNode(id, relation = 0){

        return await this.getEdgesforNode(id);
    }

    async getEdgesforNode(id) {

        const results = [];
        const key = id + "";
        const row = await this.nodeTable.row(key).get();
        const CFName = this.columnFamilyNode.id;
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


    async getEdgeCount() {
        return await this.metadata.getCount("edges");
    }

    async increaseEdgeDepthById(fnId, snId, isPopularRightNode = false, edgeTime = null) {

        const requests = [];
        const edges = [];

        if (this.dbConfig.leftNodeEdge) {
            const columnName = `${ED}#${snId}`;
            const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
            const leftNodeId = fnId + "";
            const row = this.nodeTable.row(leftNodeId);
            edges.push(qualifier);
            requests.push(row.increment(qualifier));

            // Delete cache on left node if exists
            requests.push(this.yildiz.cache.del(`gnbpf:identifier:${fnId}`));
        }

        if (this.dbConfig.rightNodeEdge) {

            if (!isPopularRightNode) {
                const columnName = `${ED}#${fnId}`;
                const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
                const rightNodeId = snId + "";
                const row = this.nodeTable.row(rightNodeId);
                edges.push(qualifier);
                requests.push(row.increment(qualifier));
    
                // Delete cache on right node if exists
                requests.push(this.yildiz.cache.del(`gnbpf:identifier:${fnId}`));
            }
            else {
                edgeTime = edgeTime || Date.now();
                const key = `${fnId}#${snId}`;
                const row = this.popnodeTable.row(key);

                const qualifierData = `${this.columnFamilyPopnode.id}:depth`;
                requests.push(row.increment(qualifierData));
                

                const saveData = {
                    [this.columnFamilyPopnode.id]: {
                        edgeTime
                    }
                }
                requests.push(row.save(saveData));
            }
        }

        try {
            await Promise.all(requests);
        } catch (error) {
            debug("Error while saving row" + error);
            return {
                success: false
            };
        }

        return {
            success: true,
            edges
        };
    }

    async decreaseEdgeDepthById(fnId, snId, isPopularRightNode = false, edgeTime = null) {

        const requests = [];
        const edges = [];

        if (this.dbConfig.leftNodeEdge) {
            const columnName = `${ED}#${snId}`;
            const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
            const leftNodeId = fnId + "";
            const row = this.nodeTable.row(leftNodeId);
            edges.push(qualifier);
            requests.push(row.increment(qualifier, -1));

            // Delete cache on left node if exists
            requests.push(this.yildiz.cache.del(`gnbpf:identifier:${fnId}`));

        }

        if (this.dbConfig.rightNodeEdge) {
            if (!isPopularRightNode) {
                const columnName = `${ED}#${fnId}`;
                const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
                const rightNodeId = snId + "";
                const row = this.nodeTable.row(rightNodeId);
                edges.push(qualifier);
                requests.push(row.increment(qualifier, -1));
    
                // Delete cache on right node if exists
                requests.push(this.yildiz.cache.del(`gnbpf:identifier:${fnId}`));
            }
            else {
                edgeTime = edgeTime || Date.now();
                const key = `${fnId}#${snId}`;
                const row = this.popnodeTable.row(key);

                const qualifierData = `${this.columnFamilyPopnode.id}:depth`;
                requests.push(row.increment(qualifierData, -1));

                const saveData = {
                    [this.columnFamilyPopnode.id]: {
                        edgeTime
                    }
                }
                requests.push(row.save(saveData));
            }
        }

        try {
            await Promise.all(requests);
        }
        catch (error) {
            debug("Error while saving row" + error);
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

        if (!first || !second) {
            throw new Error("missing left or right id params.");
        }

        if (relation === null) {
            throw new Error("relation can not be null");
        }

        const edge = await this.edgeExistsId(first, second, relation);

        if (!edge) {
            return null;
        }

        if (isNaN(relation)) {
            relation = strToInt(relation);
        }

        const cacheKey = `gnbpf:identifier:${first}:${second}:${relation}`;
        await this.yildiz.cache.del(cacheKey);

        const requests = [];
        const CFName = this.columnFamilyNode.id;

        if (this.dbConfig.leftNodeEdge) {

            const key = first + "";
            const row = this.nodeTable.row(key);
            const cells = edge.id
                .filter(edgeId => key !== edgeId.split("#")[1])
                .map(edgeId => `${CFName}:${edgeId}`);

            if (cells) {
                requests.push(row.deleteCells(cells));
            }
        }

        if (this.dbConfig.rightNodeEdge) {
            
            const key = second + "";
            const row = this.nodeTable.row(key);
            const cells = edge.id
                .filter(edgeId => key !== edgeId.split("#")[1])
                .map(edgeId => `${CFName}:${edgeId}`);
            
            if (cells) {
                requests.push(row.deleteCells(cells));
            }
        }

        this.metadata.decreaseCount("edges");

        return await Promise.all(requests);
    }

    async getEdgeTime(first, second, relation = null) {

        if (!first || !second) {
            throw new Error("missing left or right id params.");
        }

        const identifier = relation ? `${first}#${second}#${relation}` : `${first}#${second}`;

        const edge = await this._getRow(identifier, this.popnodeTable, this.columnFamilyPopnode.id);

        const timestamp = edge && edge.edgeTime || null;

        return timestamp;
    }

    /* ### NODES ### */

    async createNode(identifier = generateId(), properties = {}, _extend = {}, ttld = false, identifierValue) {

        const data = Object.assign({}, _extend, properties);
        const ttldVal = ttld + "";
        const key = identifier + "";

        const val = {
            key,
            data: {
                [this.columnFamilyNode.id] : {
                    data: JSON.stringify(data),
                    ttld: ttldVal,
                    value: identifierValue
                }
            }
        };
        const valTTL = {
            key: `${key}_nodes`,
            data: {
                [this.columnFamilyTTL.id] : {
                    value: "1"
                }
            }
        };

        const requests = [this.nodeTable.insert([val])];
        if (ttld) {
            requests.push(this.ttlTable.insert([valTTL]));
        }
        
        try {
            await Promise.all(requests);
        }
        catch(error) {
            return error;
        }

        this.metadata.increaseCount("nodes");
        this.metrics.inc("node_created");
        const result = await this.getNodeByIdentifier(key);

        return result;
    }

    async removeNode(identifier) {

        const cacheKey = `gnbpf:identifier:${identifier}`;
        await this.yildiz.cache.del(cacheKey);

        const row = this.nodeTable.row(identifier + "");

        try {
            await row.get();
        } catch (error) {
            return null;
        }

        const rowObject = await this.getNodeByIdentifier(identifier);

        const popNodeKeys = Object.keys(rowObject)
            .filter(key => key.includes(ED) || key.includes(EC))
            .map(key => key.replace(/ed|ec/, identifier));

        const result = await row.delete();

        this.metadata.decreaseCount("nodes");

        return result;
    }

    async removeNodeComplete(identifier) {

        const row = this.nodeTable.row(identifier + "");

        try {
            await row.get();
        } catch (error) {
            return null;
        }

        const rowObject = await this.getNodeByIdentifier(identifier);

        const popNodeKeys = Object.keys(rowObject)
            .filter(key => key.includes(ED) || key.includes(EC))
            .map(key => key.replace(/ed|ec/, identifier));

        const cacheKey = `gnbpf:identifier:${identifier}`;
        await this.yildiz.cache.del(cacheKey);

        const deletion = [
            row.delete()
        ];

        popNodeKeys.map(key => {
            deletion.push(this.removePopNode(key))
        });

        const result = await Promise.all(deletion);

        this.metadata.decreaseCount("nodes");
        this.metadata.decreaseCount("edges", popNodeKeys.length);

        return result;
    }

    async removePopNode(identifier) {

        const row = this.popnodeTable.row(identifier + "");

        try {
            await row.get();
        }
        catch (err) {
            return null;
        }

        return await row.delete();
    }

    async getNodeByIdentifier(identifier) {

        const cacheKey = `gnbpf:identifier:${identifier}`;
        const cacheResult = await this.yildiz.cache.getNode(cacheKey);
        
        if (cacheResult) {
            return cacheResult;
        }

        const start = Date.now();

        const node = await this._getRow(identifier, this.nodeTable, this.columnFamilyNode.id);

        await this.yildiz.cache.setNode(cacheKey, node);

        this.yildiz.metrics.set("get_node_by_identifier", Date.now() - start);

        return node;
    }

    async doesNodeExist(identifier) {

        const key = identifier + "";

        const cacheKey = `gnbpf:exists:node:${identifier}`;
        const cacheResult = await this.yildiz.cache.getNode(cacheKey);

        // Only return from cache if it exists
        if (cacheResult) {
            return cacheResult;
        }

        const nodeExists = await this.nodeTable.row(key).exists();
        const exists = nodeExists && nodeExists[0];

        await this.yildiz.cache.setNode(cacheKey, exists);

        return exists;
    }

    async getNodeCount() {
        return await this.metadata.getCount("nodes");
    }

    async getCacheByIdentifier(identifier) {

        const start = Date.now();

        const cache = await this._getRow(identifier, this.cacheTable, this.columnFamilyCache.id);

        this.yildiz.metrics.set("get_cache_by_identifier", Date.now() - start);

        const result = cache && cache.value || null;

        return result;
    }

    async createCache(cache) {

        const start = Date.now();

        const row = this.cacheTable.row(cache.identifier + "");
        const cfName = this.columnFamilyCache.id;
        
        const rowTTL = this.ttlTable.row(`${cache.identifier}_caches`);
        const cfNameTTL = this.columnFamilyTTL.id;
        const saveDataTTL = {
            [cfNameTTL]: {
                value: "1"
            }
        }

        const saveData = {
            [cfName]: {
                value: JSON.stringify(cache)
            }
        }

        await Promise.all([
            row.save(saveData),
            rowTTL.save(saveDataTTL)
        ]);

        this.yildiz.metrics.set("save_cache_bigtable", Date.now() - start);

        return cache;
    }

}

module.exports = NodeHandlerSingle;