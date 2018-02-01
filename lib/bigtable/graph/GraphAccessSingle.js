"use strict";

const Promise = require("bluebird");
const validator = require("validator");
const debug = require("debug")("yildiz:graphaccess");
const {generateId, strToInt} = require("./../../utils/index.js");

class GraphAccessSingle {

    constructor(yildiz){
        this.yildiz = yildiz;
        this.instance = this.yildiz.instance;
        this.nodeHandler = null;
        this.translator = null;
    }

    async init(){
        this.nodeHandler = await this.yildiz.getNodeHandler();
        this.translator = await this.yildiz.getTranslator();
    }

    _incStat(key){
        return this.yildiz.incStat(key);
    }

    async edgeInfoForNodesRelatingToTranslateValues(values = []){

        if(!Array.isArray(values)){
            throw new Error("values must be an array");
        }

        if(!values.length){
            throw new Error("values should not be empty");
        }

        this._incStat("edge_info_nodes_translates");
        const nodeIdentifiers = values.map(value => strToInt(value) + "");

        // If no presumed node id found, return empty array 
        if (!nodeIdentifiers.length) {
            return [];
        }

        // From the presumed node id, check the nodes table and get the edges id
        const nodes = (await Promise.all(
            nodeIdentifiers.map(identifier => this.nodeHandler.getNodeByIdentifier(identifier, true))
        )).map(nodeObject => nodeObject.getFull());

        const edges = [];
        nodes.forEach(
            // For Each Node return edge field
            node => {
                Object.keys(node).map(nodeKey => {
                    if(nodeKey.includes("ec") || nodeKey.includes("ed")) {
                        // Push only if it is edges
                        edges.push({
                            id: nodeKey,
                            data: node[nodeKey]
                        });
                    } 
                });
            }
        );

        return edges;
    }

    async upsertSingleEdgeRelationBetweenNodes(body, withTransaction = true){

        const start = Date.now();

        if(!body || typeof body !== "object"){
            return Promise.reject(new Error("Body must be an object."));
        }
        
        this._incStat("upsert_relation");
        
        let {
            leftNodeIdentifierVal, 
            rightNodeIdentifierVal, 
            leftNodeData, 
            rightNodeData,
            ttld, 
            relation, 
            edgeData, 
            depthBeforeCreation
        } = body;

        const presumedNodeLeft = strToInt(leftNodeIdentifierVal) + "";
        const presumedNodeRight = strToInt(rightNodeIdentifierVal) + "";

        // Check node table from the presumed id from translates table if they exist
        let nodeLeft = (await this.nodeHandler.getNodeByIdentifier(presumedNodeLeft)).getFull();
        let nodeRight = (await this.nodeHandler.getNodeByIdentifier(presumedNodeRight)).getFull();
        
        // If the nodes don't exist create them
        if (!nodeLeft) {
            nodeLeft = (await this.nodeHandler.createNode(presumedNodeLeft, leftNodeData, {}, ttld, leftNodeIdentifierVal)).getFull();
        }

        if (!nodeRight) {
            nodeRight = (await this.nodeHandler.createNode(presumedNodeRight, rightNodeData, {}, ttld, rightNodeIdentifierVal)).getFull();
        }

        // If NOT depthBeforeCreation, simply create a new edge
        let edge = null;

        if (!depthBeforeCreation) {
            const edgeId = await this.nodeHandler.createEdgeWithId(presumedNodeLeft, presumedNodeRight, relation, edgeData, {}, ttld, depthBeforeCreation);
            edge = {
                edgeId,
                leftNodeId: presumedNodeLeft, 
                rightNodeId: presumedNodeRight
            };
        } else {
            
            // If depthBeforeCreation get the edge
            // Its fine to not select for relation here, because in depthBeforeCreation mode there should only
            // ever be one single edge for two nodes
            const edges = await this.nodeHandler.edgeExistsId(presumedNodeLeft, presumedNodeRight, strToInt(relation));
            let edgeId = null;

            // If edge doesn't exist, create the edge
            if (!edges) {
                edgeId = await this.nodeHandler.createEdgeWithId(presumedNodeLeft, presumedNodeRight, relation, edgeData, {}, ttld, depthBeforeCreation);

            } else {
                edgeId = (await this.nodeHandler.increaseEdgeDepthById(presumedNodeLeft, presumedNodeRight)).edges;
            }

            edge = {
                edgeId,
                leftNodeId: presumedNodeLeft,
                rightNodeId: presumedNodeRight
            };
        
        }

        const diff = new Date() - start;
        debug(`edge upsert took ${diff} ms`);

        return edge; 
    }
}

module.exports = GraphAccessSingle;