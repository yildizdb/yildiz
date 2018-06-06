"use strict";

const Promise = require("bluebird");
const validator = require("validator");
const debug = require("debug")("yildiz:graphaccess");

const {generateId, strToInt} = require("./../../utils/index.js");

class GraphAccessSingle {

    constructor(yildiz){
        this.yildiz = yildiz;
        this.metrics = this.yildiz.metrics;
        this.lookupCache = this.yildiz.lookupCache;
        this.config = this.yildiz.config;

        this.nodeHandler = null;
        this.translator = null;
    }

    async init(){
        this.nodeHandler = await this.yildiz.getNodeHandler();
        this.translator = await this.yildiz.getTranslator();
    }

    async setLastAccess(values) {
        const nodeIdentifiers = values.map(value => strToInt(value) + "");
        await this.yildiz.fetchJob.bumpTTL(nodeIdentifiers);
    }

    async setCacheLastAccess(values) {
        const nodeIdentifiers = values.map(value => strToInt(value) + "");
        await this.buildNodes(nodeIdentifiers);
    }

    async getRightNodes(identifiers) {

        // Get the other nodes data
        // cache will contain an array of object data of resolved right node
        // nocache will contain an array of key of unresolved right node
        const {cache, nocache} = await this.lookupCache.classifyRightNode(identifiers);

        // Return if everything is in cache
        if (!nocache.length) {
            return cache;
        }

        // Resolve the right node if it is not in cache
        const nocacheNodes = (await Promise.all(
                nocache.map(identifier => this.nodeHandler.getNodeByIdentifier(identifier))
            ))
            .filter(node => !!node)
            .map(node => {
                const nodeObj = {
                    identifier: node.identifier,
                    value: node.value
                };

                // Only put the data if it is not null and not empty object
                if (node.data) {
                    if (typeof node.data === "object") {
                        if (Object.keys(node.data).length) {
                            nodeObj.data = node.data;
                        }
                    } else {
                        nodeObj.data = node.data;
                    }
                }

                return nodeObj;
            });

        this.metrics.inc("resolvedRightNode_cache_hits", cache.length);
        this.metrics.inc("resolvedRightNode_cache_miss", nocache.length);

        // Set them in cache
        await this.lookupCache.setRightNode(nocacheNodes);

        // Concat the result
        return nocacheNodes.concat(cache);
    }

    async buildNodes(identifiers) {

        // Get the nodes from node table
        const nodes = (await Promise.all(
            identifiers.map(identifier => this.nodeHandler.getNodeByIdentifier(identifier))
        )).filter(node => !!node);

        if(!nodes.length) {
            return [];
        }

        const resultsPromise = nodes.map(

            async node => {

                const edges = [];
                const rawOtherNodeIdentifiers = [];

                const nodeKeys = Object.keys(node);

                // Get the edge data and push the other node identifier to be retrieved later
                for(let i = 0; i < nodeKeys.length; i++) {

                    if(nodeKeys[i].includes("ec") || nodeKeys[i].includes("ed")) {

                        const rightNodeId = nodeKeys[i].split("#")[1];
                        const relation = nodeKeys[i].split("#")[2];

                        const edgeObj = {
                            leftNodeId: node.identifier,
                            rightNodeId,
                            data: node[ nodeKeys[i]]
                        };

                        // Improve performance
                        if (this.config.getEdgeTime) {
                            edgeObj.edgeTime = await this.nodeHandler.getEdgeTime(node.identifier, rightNodeId, relation);
                        }

                        if (relation) {
                            edgeObj.relation = relation;
                        }

                        // Push only if it is edges
                        edges.push(edgeObj);

                        rawOtherNodeIdentifiers.push(nodeKeys[i].split("#")[1]);
                    } 

                }

                // Remove duplicates of right nodes
                const otherNodeIdentifiers = rawOtherNodeIdentifiers
                    .filter((item, pos) => rawOtherNodeIdentifiers.indexOf(item) === pos);

                // Get the right node from cache or resolve them from node table
                const otherNodes = await this.getRightNodes(otherNodeIdentifiers);

                // Set the current node data in object
                const currentNode = {
                    identifier: node.identifier,
                    value: node.value
                };

                // Only put the data if it is not null and not empty object
                if (node.data) {
                    if (typeof node.data === "object") {
                        if (Object.keys(node.data).length) {
                            currentNode.data = node.data;
                        }
                    } else {
                        currentNode.data = node.data;
                    }
                }

                // Return the result after resolving edges and nodes
                return {
                    identifier: node.identifier,
                    value: node.value,
                    edges,
                    nodes: [currentNode].concat(otherNodes)
                };
            }
        );

        // Resolve all promises as the array will contain Promise as element
        const results = await Promise.all(resultsPromise);

        // Set the existence in redis cache
        await this.lookupCache.setExistence(results);
        
        // Save the cache in bigtable cache table
        await Promise.all(
            results.map( result => this.nodeHandler.createCache(result))
        );

        return results;
    }

    buildResult(resultArray) {

        const result = {};

        // Build identifiers field
        result.identifiers = resultArray.map(singleResult => {
            return {
                identifier: singleResult.identifier,
                value: singleResult.value
            };
        });

        // Remove duplicate of nodes field
        const seenNodes = {};
        result.nodes = [].concat(...resultArray
            .map(singleResult => singleResult.nodes))
            .filter(singleResult => {
                const exists = seenNodes[singleResult.identifier];
                if (!exists) {
                    seenNodes[singleResult.identifier] = true;
                }
                return !exists;
            });

        // Remove duplicate of edges field
        const seenEdges = {};
        result.edges = [].concat(...resultArray
            .map(singleResult => singleResult.edges))
            .filter(singleResult => {
                const key = `${singleResult.leftNodeId}_${singleResult.rightNodeId}_${singleResult.relation}`;
                const exists = seenEdges[key];
                if (!exists) {
                    seenEdges[key] = true;
                }
                return !exists;
            });

        return result;
    }

    async edgeInfoForNodesRelatingToTranslateValues(values = []){

        if(!Array.isArray(values)){
            throw new Error("values must be an array");
        }

        if(!values.length){
            throw new Error("values should not be empty");
        }

        const start = Date.now();

        let error = null;
        let cacheResults = [];

        const nodeIdentifiers = values.map(value => strToInt(value) + "");
        const {cache, nocache} = await this.lookupCache.classifyExistence(nodeIdentifiers);

        // Only get the cache from bigtable if the cache exists after checking in redis
        if (cache.length) {
            
            // Get the cache from cache table in bigtable
            cacheResults = await Promise.all(
                cache.map(identifier => this.nodeHandler.getCacheByIdentifier(identifier))
            );
    
            // Return error if there is an empty result from bigtable
            cacheResults.map((result,index) => {
    
                const errorKeys = [];
    
                if(!result) {
                    errorKeys.push(cache[index]);
                }
    
                if(errorKeys.length) {
                    error = new Error(`Cache in Bigtable does not exist for keys ${errorKeys.join(",")}`);
                }
            });
    
            // Throw error if exists
            if(error) {
                throw error;
            }

            this.metrics.inc("resolvedNodes_cache_hits", cache.length);
        }
 
        // If everything is in the cache, just return the cache
        if(!nocache.length) {

            const result = this.buildResult(cacheResults);
            
            const diff = Date.now() - start;
            debug(`cached translated edge info took ${diff} ms`);
            this.metrics.set("translated_edge_info_duration", diff);

            return result;
        }

        // Get the uncache node
        const resultArray = await this.buildNodes(nocache);

        this.metrics.inc("resolvedNodes_cache_miss", resultArray.length);

        // Concat the resultArray with the one in cache and build expected result
        const result = this.buildResult(resultArray.concat(cacheResults));
        
        const diff = Date.now() - start;

        if (this.config.translatedEdgeDebug) {
            debug(`translated edge info took ${diff} ms`);
        }

        this.metrics.set("translated_edge_info_duration", diff);

        return result;
    }
    
    async upsertSingleEdgeRelationBetweenNodes(body, withTransaction = true){

        const start = Date.now();

        if(!body || typeof body !== "object"){
            return Promise.reject(new Error("Body must be an object."));
        }
        
        let {
            leftNodeIdentifierVal, 
            rightNodeIdentifierVal, 
            leftNodeData, 
            rightNodeData,
            ttld, 
            relation, 
            edgeData, 
            depthBeforeCreation,
            isPopularRightNode,
            edgeTime
        } = body;

        const presumedNodeLeft = strToInt(leftNodeIdentifierVal) + "";
        const presumedNodeRight = strToInt(rightNodeIdentifierVal) + "";

        // Check node table from the presumed id from translates table if they exist
        const nodeLeftExists = await this.nodeHandler.doesNodeExist(presumedNodeLeft);
        const nodeRightExists = await this.nodeHandler.doesNodeExist(presumedNodeRight);
        
        // If the nodes don't exist create them
        if (!nodeLeftExists) {
            await this.nodeHandler.createNode(presumedNodeLeft, leftNodeData, {}, ttld, leftNodeIdentifierVal);
        }

        if (!nodeRightExists) {
            await this.nodeHandler.createNode(presumedNodeRight, rightNodeData, {}, ttld, rightNodeIdentifierVal);
        }

        // If NOT depthBeforeCreation, simply create a new edge
        let edge = null;

        if (!depthBeforeCreation) {
            const edgeId = await this.nodeHandler.createEdgeWithId(presumedNodeLeft, presumedNodeRight, relation, edgeData, {}, ttld, depthBeforeCreation, isPopularRightNode, edgeTime);
            edge = {
                edgeId,
                leftNodeId: presumedNodeLeft, 
                rightNodeId: presumedNodeRight
            };
        } else {
            
            // If depthBeforeCreation get the edge
            // It's fine to not select for relation here, because in depthBeforeCreation mode there should only be one single edge for two nodes
            const edges = await this.nodeHandler.edgeExistsId(presumedNodeLeft, presumedNodeRight, strToInt(relation));
            let edgeId = null;

            // If edge doesn't exist, create the edge
            if (!edges) {
                edgeId = await this.nodeHandler.createEdgeWithId(presumedNodeLeft, presumedNodeRight, relation, edgeData, {}, ttld, depthBeforeCreation, isPopularRightNode, edgeTime);
            } else {
                edgeId = (await this.nodeHandler.increaseEdgeDepthById(presumedNodeLeft, presumedNodeRight, isPopularRightNode, edgeTime)).edges;
            }

            edge = {
                edgeId,
                leftNodeId: presumedNodeLeft,
                rightNodeId: presumedNodeRight
            };
        
        }

        const diff = new Date() - start;
        const withOrWithout = depthBeforeCreation ? "with" : "without";
        
        this.yildiz.metrics.set(`upsert_${withOrWithout}_depthBeforeCreation_duration`, diff);

        if (diff > 1000) {
            debug(`edge upsert took too long, ${diff} ms`, body);
        } else {

            if (this.config.upsertDebug) {
                debug(`edge upsert took ${diff} ms`);
            }
        }

        return edge; 
    }
}

module.exports = GraphAccessSingle;