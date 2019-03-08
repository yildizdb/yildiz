import Debug from "debug";
import Bigtable from "@google-cloud/bigtable";
import Bluebird from "bluebird";

import { Yildiz } from "../Yildiz";
import {
    generateId,
    strToInt,
} from "./../../utils";

import { Metadata } from "../db/Metadata";
import { Metrics } from "../metrics/Metrics";
import { DatabaseConfig } from "../../interfaces/ServiceConfig";

import { GenericObject, AnyObject } from "../../interfaces/Generic";
import { YildizSingleSchema } from "../../interfaces/Yildiz";
import { EdgeCache } from "../../interfaces/Graph";
import { RedisClient } from "../cache/RedisClient";

const debug = Debug("yildiz:nodehandler");

const ED = "ed";
const EC = "ec";

const TYPE_NODES = "nodes";
const TYPE_EDGES = "edges";
const TYPE_POPNODES = "popnodes";
const TYPE_CACHES = "caches";

export class NodeHandler {

    private yildiz: Yildiz;
    private metadata: Metadata;
    private metrics: Metrics;
    private dbConfig: DatabaseConfig;
    private redisClient: RedisClient;
    private lifetime: number;
    private cacheLifetime: number;

    private nodeTable: Bigtable.Table;
    private popnodeTable: Bigtable.Table;
    private cacheTable: Bigtable.Table;
    private ttlTable: Bigtable.Table;
    private ttlReferenceTable: Bigtable.Table;

    private columnFamilyNode: Bigtable.Family;
    private columnFamilyPopnode: Bigtable.Family;
    private columnFamilyCache: Bigtable.Family;
    private columnFamilyTTL: Bigtable.Family;
    private columnFamilyTTLReference: Bigtable.Family;

    constructor(yildiz: Yildiz) {

        this.yildiz = yildiz;
        this.metadata = this.yildiz.metadata;
        this.metrics = this.yildiz.metrics;
        this.dbConfig = this.yildiz.config.database;
        this.redisClient = this.yildiz.redisClient;

        // Get the Tables and CFs
        const {
            nodeTable,
            popnodeTable,
            cacheTable,
            ttlTable,
            ttlReferenceTable,
            columnFamilyNode,
            columnFamilyPopnode,
            columnFamilyCache,
            columnFamilyTTL,
            columnFamilyTTLReference,
        } = this.yildiz.models;

        // Tables
        this.nodeTable = nodeTable;
        this.popnodeTable = popnodeTable;
        this.cacheTable = cacheTable;
        this.ttlTable = ttlTable;
        this.ttlReferenceTable = ttlReferenceTable;

        // Column Families
        this.columnFamilyNode = columnFamilyNode;
        this.columnFamilyPopnode = columnFamilyPopnode;
        this.columnFamilyCache = columnFamilyCache;
        this.columnFamilyTTL = columnFamilyTTL;
        this.columnFamilyTTLReference = columnFamilyTTLReference;

        this.lifetime = this.yildiz.config.ttl.lifeTimeInSec || 180;
        this.cacheLifetime = this.yildiz.config.ttl.cacheLifeTimeInSec || 120;
    }

    private getParsedValue(value: string) {

        let result = value;

        try {
            result = JSON.parse(value);
        } catch (error) {
            // DO Nothing
        }

        return result;
    }

    private async checkReferenceAndDeleteTTL(type: string, identifier: string) {

        const referenceTTL = await this.getRow
            (`reference#${type}#${identifier}`, this.ttlReferenceTable, this.columnFamilyTTLReference.id);

        if (!referenceTTL) {
            return;
        }

        const ttlRow = this.ttlTable.row(referenceTTL.ttlKey);
        await ttlRow.deleteCells([`${this.columnFamilyTTL.id}:${identifier}`]);
    }

    private async setTTL(type: string, identifier: string, ttlInSec?: number) {

        const timestamp = Date.now() + ((ttlInSec || this.lifetime) * 1000);
        const ttlKey = `ttl#${type}#${timestamp}`;

        const ttlInsertData = [
            {
                key: ttlKey,
                data: {
                    [this.columnFamilyTTL.id] : {
                        [identifier]: "true",
                    },
                },
            },
        ];

        const ttlReferenceInsertData = [
            {
                key: `reference#${type}#${identifier}`,
                data: {
                    [this.columnFamilyTTLReference.id] : {
                        ttlKey,
                    },
                },
            },
        ];

        // NOTE: This can't be done on parallel to avoid race condition on ttlReferenceTable.insert to be finished first
        await this.checkReferenceAndDeleteTTL(type, identifier);

        await Bluebird.all([
            this.ttlTable.insert(ttlInsertData),
            this.ttlReferenceTable.insert(ttlReferenceInsertData),
        ]);

    }

    private async getRow(identifier: string | number, table: any, cFName: string): Promise<YildizSingleSchema | null> {

        const start = Date.now();
        const result: YildizSingleSchema = { identifier, id: identifier };
        const row = table.row(identifier + "");
        let rowGet = null;

        try {
            rowGet = await row.get();
        } catch (error) {

            if (!error.message.startsWith("Unknown row")) {
                throw error;
            }

            // Set the result to null if it throws at row.get - Error: Unknown row
            return null;
        }

        if (
            rowGet &&
            rowGet[0] &&
            rowGet[0].data &&
            rowGet[0].data[cFName]
        ) {
            const rowData: any = rowGet[0].data[cFName];
            Object.keys(rowData).forEach((column: string) => {
                if (rowData[column] && rowData[column][0] && rowData[column][0].value) {
                    result[column] = this.getParsedValue(rowData[column][0].value);
                }
            });
        }

        this.metrics.inc("fetch_row_count");
        this.yildiz.metrics.inc("fetch_row_time", Date.now() - start);
        return result;
    }

    private async updateEdgeOnNode(nodeId: string, edgeId: string) {

        const nodeRow = this.nodeTable.row(nodeId + "");
        const rules = [{
            column: `${this.columnFamilyNode.id}:edges`,
            append: edgeId + ",",
        }];

        return await nodeRow.createRules(rules);
    }

    private async getAnyTypeOfEdges(
        originNodeId: string | number,
        destinationNodeId: string | number,
        relation: string | number,
        cFName: string) : Promise<any> {
        
        let result = null;

        // It will fetch the edges whether it is a depth edge or relation edge

        try {
            result = (await this.nodeTable.row(originNodeId + "")
            .get([
                `${cFName}:${ED}#${destinationNodeId}`,
                `${cFName}:${EC}#${destinationNodeId}#${relation}`,
            ]))
            .filter((resultLeftMember: AnyObject) => !!resultLeftMember)
            .map((resultLeftMember: AnyObject) => resultLeftMember[cFName]);
        } catch(error) {

            // Surpress Unknown row error message
            if (!error.message.startsWith("Unknown row")) {
                debug("unable to get edge", error);
            }
        }

        if (!result) {
            return null;
        }

        const key = result[0] && Object.keys(result[0])[0];
        const value = result[0] &&
            result[0][key] &&
            result[0][key][0] &&
            result[0][key][0].value;

        return {
            key,
            value,
        };
    }

    /* ### EDGES ### */

    public async edgeExistsId(
        firstNodeId: string | number,
        secondNodeId: string | number,
        relation: number | string = 0): Promise<EdgeCache | null> {

        if (!firstNodeId || !secondNodeId) {
            throw new Error("missing left or right id params.");
        }

        if (relation === null) {
            throw new Error("relation can not be null");
        }

        if (isNaN(relation as number)) {
            relation = strToInt(relation);
        }

        const cacheKey = `gnbpf:identifier:${firstNodeId}:${secondNodeId}:${relation}`;
        const cacheResult = await this.yildiz.cache.getEdge(cacheKey);

        if (cacheResult) {
            return cacheResult as EdgeCache;
        }

        const start = Date.now();

        const cFName = this.columnFamilyNode.id;

        const result: EdgeCache = {
            id: [],
            data: {},
        };

        const [resultLeft, resultRight] = await Bluebird.all([
            !this.dbConfig.leftNodeEdge ? Promise.resolve() :
                this.getAnyTypeOfEdges(firstNodeId, secondNodeId, relation, cFName),
            !this.dbConfig.leftNodeEdge ? Promise.resolve() :
                this.getAnyTypeOfEdges(secondNodeId, firstNodeId, relation, cFName),
        ]);

        const leftKey = resultLeft && resultLeft.key;
        const rightKey = resultRight && resultRight.key;

        if (leftKey) {
            result.id.push(leftKey);
            result.data[leftKey] = resultLeft && resultLeft.value;
        }

        if (rightKey) {
            result.id.push(rightKey);
            result.data[rightKey] = resultRight && resultRight.value;
        }

        if (!result.id.length) {
            return null;
        }

        await this.yildiz.cache.setEdge(cacheKey, result);

        this.yildiz.metrics.set("check_exists_edge", Date.now() - start);

        return result;
    }

    public async createEdgeWithId(
        firstNodeId: string | number,
        secondNodeId: string | number,
        relation: string | number = 0,
        attributes = {},
        extend: GenericObject = {},
        ttld = false,
        depthMode = false,
        isPopularRightNode = false,
        edgeTime?: string | number) {

        if (!firstNodeId || !secondNodeId) {
            throw new Error("missing left or right id params.");
        }

        if (relation === null) {
            throw new Error("relation can not be null");
        }

        if (isNaN(relation as number)) {
            relation = strToInt(relation);
        }

        if (isNaN(firstNodeId as number)) {
            firstNodeId = strToInt(firstNodeId);
        }

        if (isNaN(secondNodeId as number)) {
            secondNodeId = strToInt(secondNodeId);
        }

        const requests = [];
        const results = [];
        const val =  JSON.stringify(Object.assign({}, extend, attributes));

        if (this.dbConfig.leftNodeEdge) {

            // columnName is just like in the edge creation of rightNode, but the column identifier is reverse
            const columnName = `${depthMode ? ED : EC}#${secondNodeId}${depthMode ? "" : "#" + relation}`;
            const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
            const leftNodeId = firstNodeId + "";
            const row = this.nodeTable.row(leftNodeId);
            const saveData = {
                [this.columnFamilyNode.id]: {
                    [columnName]: val,
                },
            };

            results.push(qualifier);
            requests.push(depthMode ? row.increment(qualifier) : row.save(saveData));

            // Delete cache on left node if exists
            requests.push(this.yildiz.cache.del(`gnbpf:identifier:${firstNodeId}`));
            this.metrics.inc("edge_created_leftNode");

            if (ttld) {
                requests.push(this.setTTL(TYPE_EDGES, `${leftNodeId}:${columnName}`));
            }
        }

        if (this.dbConfig.rightNodeEdge) {

           // TODO: if popularRightEdge mode treat differently (currently just dont write it to db)
            if (!isPopularRightNode) {

                // If it is depthMode the columnName will be like ED#12345 where 12345 is the id (murmurhash) of left id
                // If it is NOT depthmode the columnName will be like EC#12345#456
                // where 12345 is the id (murmurhash) of left id and 456 is the id (murmurhash) of relation
                const columnName = `${depthMode ? ED : EC}#${firstNodeId}${depthMode ? "" : "#" + relation}`;
                const rightNodeId = secondNodeId + "";
                const row = this.nodeTable.row(rightNodeId);
                const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
                const saveData = {
                    [this.columnFamilyNode.id]: {
                        [columnName]: val,
                    },
                };

                results.push(qualifier);
                requests.push(depthMode ? row.increment(qualifier) : row.save(saveData));

                // Delete cache on right node if exists
                requests.push(this.yildiz.cache.del(`gnbpf:identifier:${secondNodeId}`));

                if (ttld) {
                    requests.push(this.setTTL(TYPE_EDGES, `${rightNodeId}:${columnName}`));
                }

            } else {
                // Save popularnode edge data in separate table

                edgeTime = edgeTime || Date.now();

                const popnodeKey = `${firstNodeId}#${secondNodeId}${depthMode ? "" : "#" + relation}`;
                const row = this.popnodeTable.row(popnodeKey);
                const column = depthMode ? "depth" : "data";

                // If depthmode, we need to call increment and save the edgeTime with two calls
                if (depthMode) {
                    const qualifierData = `${this.columnFamilyPopnode.id}:${column}`;
                    requests.push(row.increment(qualifierData));

                    const saveData = {
                        [this.columnFamilyPopnode.id]: {
                            edgeTime,
                        },
                    };

                    requests.push(row.save(saveData));

                // Otherwise we just need to run insertion for both columns
                } else {
                    requests.push(this.popnodeTable.insert([{
                        key: popnodeKey,
                        data: {
                            [this.columnFamilyPopnode.id] : {
                                [column]: val,
                                edgeTime,
                            },
                        },
                    }]));
                }

                if (ttld) {
                    requests.push(this.setTTL(TYPE_POPNODES, popnodeKey));
                }
            }
            this.metrics.inc("edge_created_rightNode");
        }

        this.metrics.inc("edge_created");
        this.metadata.increaseCount(TYPE_EDGES);
        await Bluebird.all(requests);

        return results;
    }

    public async getEdgesForLeftNode(id: string | number, relation: string | number = 0) {
        return await this.getEdgesforNode(id);
    }

    public async getEdgesForRightNode(id: string | number, relation: string | number = 0) {
        return await this.getEdgesforNode(id);
    }

    public async getEdgesForBothNode(id: string | number, relation: string | number = 0) {
        return await this.getEdgesforNode(id);
    }

    public async getEdgesforNode(id: string | number) {

        const results = [];
        const key = id + "";
        const row = await this.nodeTable.row(key).get();
        const cFName = this.columnFamilyNode.id;
        const edgesRaw = row[0].data[cFName];
        const edges: YildizSingleSchema[] = [];

        Object.keys(edgesRaw).map(
            (edgesRawKey) => {
                if (edgesRawKey.startsWith(EC) || edgesRawKey.startsWith(ED)) {
                    edges.push(edgesRaw[edgesRawKey][0].value);
                }
            },
        );

        return edges;
    }

    public async getEdgeCount() {
        return await this.metadata.getCount(TYPE_EDGES);
    }

    public async increaseEdgeDepthById(
        firstNodeId: string | number,
        secondNodeId: string | number,
        isPopularRightNode = false,
        edgeTime?: string | number) {

        const requests = [];
        const edges = [];

        if (this.dbConfig.leftNodeEdge) {
            const columnName = `${ED}#${secondNodeId}`;
            const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
            const leftNodeId = firstNodeId + "";
            const row = this.nodeTable.row(leftNodeId);
            edges.push(qualifier);
            requests.push(row.increment(qualifier));

            // Delete cache on left node if exists
            requests.push(this.yildiz.cache.del(`gnbpf:identifier:${firstNodeId}`));
        }

        if (this.dbConfig.rightNodeEdge) {

            if (!isPopularRightNode) {
                const columnName = `${ED}#${firstNodeId}`;
                const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
                const rightNodeId = secondNodeId + "";
                const row = this.nodeTable.row(rightNodeId);
                edges.push(qualifier);
                requests.push(row.increment(qualifier));

                // Delete cache on right node if exists
                requests.push(this.yildiz.cache.del(`gnbpf:identifier:${firstNodeId}`));
            } else {
                edgeTime = edgeTime || Date.now();
                const key = `${firstNodeId}#${secondNodeId}`;
                const row = this.popnodeTable.row(key);

                const qualifierData = `${this.columnFamilyPopnode.id}:depth`;
                requests.push(row.increment(qualifierData));

                const saveData = {
                    [this.columnFamilyPopnode.id]: {
                        edgeTime,
                    },
                };

                requests.push(row.save(saveData));
            }
        }

        try {
            await Bluebird.all(requests);
        } catch (error) {
            debug("Error while saving row" + error);
            return {
                success: false,
            };
        }

        return {
            success: true,
            edges,
        };
    }

    public async decreaseEdgeDepthById(
        firstNodeId: string | number,
        secondNodeId: string | number,
        isPopularRightNode = false,
        edgeTime?: string | number) {

        const requests = [];
        const edges = [];

        if (this.dbConfig.leftNodeEdge) {
            const columnName = `${ED}#${secondNodeId}`;
            const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
            const leftNodeId = firstNodeId + "";
            const row = this.nodeTable.row(leftNodeId);
            edges.push(qualifier);
            requests.push(row.increment(qualifier, -1));

            // Delete cache on left node if exists
            requests.push(this.yildiz.cache.del(`gnbpf:identifier:${firstNodeId}`));

        }

        if (this.dbConfig.rightNodeEdge) {
            if (!isPopularRightNode) {
                const columnName = `${ED}#${firstNodeId}`;
                const qualifier = `${this.columnFamilyNode.id}:${columnName}`;
                const rightNodeId = secondNodeId + "";
                const row = this.nodeTable.row(rightNodeId);
                edges.push(qualifier);
                requests.push(row.increment(qualifier, -1));

                // Delete cache on right node if exists
                requests.push(this.yildiz.cache.del(`gnbpf:identifier:${firstNodeId}`));
            } else {
                edgeTime = edgeTime || Date.now();
                const key = `${firstNodeId}#${secondNodeId}`;
                const row = this.popnodeTable.row(key);

                const qualifierData = `${this.columnFamilyPopnode.id}:depth`;
                requests.push(row.increment(qualifierData, -1));

                const saveData = {
                    [this.columnFamilyPopnode.id]: {
                        edgeTime,
                    },
                };

                requests.push(row.save(saveData));
            }
        }

        try {
            await Bluebird.all(requests);
        } catch (error) {
            debug("Error while saving row" + error);
            return {
                success: false,
            };
        }

        return {
            success: true,
            edges,
        };
    }

    public async removeEdgeByIds(
        firstNodeId: string | number,
        secondNodeId: string | number,
        relation: string | number = 0) {

        if (!firstNodeId || !secondNodeId) {
            throw new Error("missing left or right id params.");
        }

        if (relation === null) {
            throw new Error("relation can not be null");
        }

        const edge = await this.edgeExistsId(firstNodeId, secondNodeId, relation);

        if (!edge) {
            return null;
        }

        if (isNaN(relation as number)) {
            relation = strToInt(relation);
        }

        const cacheKey = `gnbpf:identifier:${firstNodeId}:${secondNodeId}:${relation}`;
        await this.yildiz.cache.del(cacheKey);

        const requests = [];
        const cFName = this.columnFamilyNode.id;

        if (this.dbConfig.leftNodeEdge) {

            const key = firstNodeId + "";
            const row = this.nodeTable.row(key);
            const cells = edge.id
                .filter((edgeId) => key !== (edgeId + "").split("#")[1])
                .map((edgeId) => `${cFName}:${edgeId}`);

            if (cells) {
                requests.push(row.deleteCells(cells));
            }
        }

        if (this.dbConfig.rightNodeEdge) {

            const key = secondNodeId + "";
            const row = this.nodeTable.row(key);
            const cells = edge.id
                .filter((edgeId) => key !== (edgeId + "").split("#")[1])
                .map((edgeId) => `${cFName}:${edgeId}`);

            if (cells) {
                requests.push(row.deleteCells(cells));
            }
        }

        this.metadata.decreaseCount(TYPE_EDGES);

        return await Bluebird.all(requests);
    }

    public async getEdgeTime(firstNodeId: string | number, secondNodeId: string | number, relation?: string | number) {

        if (!firstNodeId || !secondNodeId) {
            throw new Error("missing left or right id params.");
        }

        const identifier = relation ? `${firstNodeId}#${secondNodeId}#${relation}` : `${firstNodeId}#${secondNodeId}`;

        const edge = await this.getRow(identifier, this.popnodeTable, this.columnFamilyPopnode.id);

        const timestamp = edge && edge.edgeTime || null;

        return timestamp;
    }

    /* ### NODES ### */

    public async createNode(
        identifier: string | number = generateId(),
        properties = {},
        extend: GenericObject = {},
        ttld = false,
        identifierValue: string | number) {

        const data = Object.assign({}, extend, properties);
        const ttldVal = ttld + "";
        const key = identifier + "";

        const insertPromises = [];

        const val = {
            key,
            data: {
                [this.columnFamilyNode.id] : {
                    data: JSON.stringify(data),
                    ttld: ttldVal,
                    value: identifierValue,
                },
            },
        };

        insertPromises.push(this.nodeTable.insert([val]));

        if (ttld) {
            insertPromises.push(this.setTTL(TYPE_NODES, key));
        }

        try {
            await Promise.all(insertPromises);
        } catch (error) {
            return error;
        }

        this.metadata.increaseCount(TYPE_NODES);
        this.metrics.inc("node_created");
        const result = await this.getNodeByIdentifier(key);

        return result;
    }

    public async removeNode(identifier: string | number) {

        const cacheKey = `gnbpf:identifier:${identifier}`;
        await this.yildiz.cache.del(cacheKey);

        const row = this.nodeTable.row(identifier + "");

        try {
            await row.get();
        } catch (error) {
            return null;
        }

        const result = await row.delete();

        this.metadata.decreaseCount(TYPE_NODES);

        return result;
    }

    public async removeNodeComplete(identifier: string | number) {

        const row = this.nodeTable.row(identifier + "");

        try {
            await row.get();
        } catch (error) {
            return null;
        }

        const rowObject = await this.getNodeByIdentifier(identifier);

        if (!rowObject) {
            return null;
        }

        const popNodeKeys = Object.keys(rowObject)
            .filter((key) => key.includes(ED) || key.includes(EC))
            .map((key) => key.replace(/ed|ec/, identifier + ""));

        const cacheKey = `gnbpf:identifier:${identifier}`;
        await this.yildiz.cache.del(cacheKey);

        const deletion: Array<Promise<void | null>> = [
            row.delete(),
        ];

        popNodeKeys.map((key) => {
            deletion.push(this.removePopNode(key));
        });

        const result = await Bluebird.all(deletion);

        this.metadata.decreaseCount(TYPE_NODES);
        this.metadata.decreaseCount(TYPE_EDGES, popNodeKeys.length);

        return result;
    }

    public async removePopNode(identifier: string | number) {

        const row = this.popnodeTable.row(identifier + "");

        try {
            await row.get();
        } catch (error) {
            return null;
        }

        return await row.delete();
    }

    public async getNodeByIdentifier(identifier: string | number, noCache?: boolean)
    : Promise<YildizSingleSchema | null> {

        const cacheKey = `gnbpf:identifier:${identifier}`;

        if (!noCache) {
            const cacheResult = await this.yildiz.cache.getNode(cacheKey);
            if (cacheResult) {
                return cacheResult as YildizSingleSchema;
            }
        }

        const start = Date.now();

        const node = await this.getRow(identifier, this.nodeTable, this.columnFamilyNode.id);

        if (!node) {
            return null;
        }

        if (!noCache) {
            await this.yildiz.cache.setNode(cacheKey, node);
        }

        this.yildiz.metrics.set("get_node_by_identifier", Date.now() - start);

        return node;
    }

    public async doesNodeExist(identifier: string | number) {

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

    public async getNodeCount() {
        return await this.metadata.getCount(TYPE_NODES);
    }

    public async bumpCacheByIdentifier(identifier: string | number): Promise<any> {

        const key = identifier + "";
        const cacheExists = await this.cacheTable.row(key).exists();
        const exists = cacheExists && cacheExists[0];

        if (!exists) {
            return new Error(`${identifier} doesn't exist in cache`);
        }
        
        this.redisClient.setExistence(identifier + "");
        this.setTTL(TYPE_CACHES, identifier + "", this.cacheLifetime);
    }

    public async getCacheByIdentifier(identifier: string | number) {

        const start = Date.now();
        const cache = await this.getRow(identifier, this.cacheTable, this.columnFamilyCache.id);
        
        this.yildiz.metrics.set("get_cache_by_identifier", Date.now() - start);

        if (!cache || !cache.value) {
            return null;
        }

        this.redisClient.setExistence(identifier + "");
        this.setTTL(TYPE_CACHES, identifier + "", this.cacheLifetime);

        return cache.value;
    }

    public async createCache(cache?: YildizSingleSchema) {

        if (!cache || !cache.identifier) {
            return;
        }

        const start = Date.now();

        const row = this.cacheTable.row(cache.identifier + "");
        const cfName = this.columnFamilyCache.id;
        const saveData = {
            [cfName]: {
                value: JSON.stringify(cache),
            },
        };
        
        this.redisClient.setExistence(cache.identifier + "");
        await Bluebird.all([
            this.setTTL(TYPE_CACHES, cache.identifier + "", this.cacheLifetime),
            row.save(saveData),
        ]);

        this.yildiz.metrics.set("save_cache_bigtable", Date.now() - start);

        return cache;
    }

}
