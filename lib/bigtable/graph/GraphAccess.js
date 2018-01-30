"use strict";

const Promise = require("bluebird");
const validator = require("validator");
const debug = require("debug")("yildiz:graphaccess");
const {generateId, strToInt} = require("./../../utils/index.js");

class GraphAccess {

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
        values = values.map(value => value + "");

        // Get the node ids from translates value
        const nodeIdentifiers = await Promise.all(values.map(value => this.translator.getTranslationFromValue(value)));

        // If no presumed node id found, return empty array 
        if (!nodeIdentifiers.length) {
            return [];
        }

        // From the presumed node id, check the nodes table and get the edges id
        const nodes = (await Promise.all(
            nodeIdentifiers.map(identifier => this.nodeHandler.getNodeByIdentifier(identifier, true))
        )).map(nodeObject => nodeObject.getFull());

        // Get the edgeIds from nodes, and clean it
        const edgesAsStrings = nodes.map(node => node.edges);

        const edgeIdentifiers =  [].concat.apply([], edgesAsStrings.map(edgeString => edgeString.split(",")))
            .filter(element => !!element)
            .filter((item, pos, self) => self.indexOf(item) === pos);

        // Get the edges for the id
        //TODO: reduce amount of database calls here
        const edges = await Promise.all(edgeIdentifiers.map(edgeIdentifier => this.nodeHandler.getEdgeByIdentifier(edgeIdentifier)));

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

        const presumedNodeLeft = strToInt(leftNodeIdentifierVal);
        const presumedNodeRight = strToInt(rightNodeIdentifierVal);

        // Check node table from the presumed id from translates table if they exist
        let nodeLeft = (await this.nodeHandler.getNodeByIdentifier(presumedNodeLeft)).getFull();
        let nodeRight = (await this.nodeHandler.getNodeByIdentifier(presumedNodeRight)).getFull();
        
        // If the nodes don't exist create them
        if (!nodeLeft) {
            await this.translator.storeTranslation(presumedNodeLeft, leftNodeIdentifierVal, {}, ttld);
            nodeLeft = (await this.nodeHandler.createNode(presumedNodeLeft, leftNodeData, {}, ttld)).getFull();
        }

        if (!nodeRight) {
            await this.translator.storeTranslation(presumedNodeRight, rightNodeIdentifierVal, {}, ttld);
            nodeRight = (await this.nodeHandler.createNode(presumedNodeRight, rightNodeData, {}, ttld)).getFull();
        }

        // If NOT depthBeforeCreation, simply create a new edge
        let edge = null;

        if (!depthBeforeCreation) {
            const edgeId = await this.nodeHandler.createEdgeWithId(nodeLeft.id, nodeRight.id, relation, edgeData, {}, ttld);

            edge = {
                edgeId,
                leftNodeId: nodeLeft.id, 
                rightNodeId: nodeRight.id
            };
        } else {  
            
            // If depthBeforeCreation get the edge
            // Its fine to not select for relation here, because in depthBeforeCreation mode there should only
            // ever be one single edge for two nodes
            const edgeLookupKey = nodeLeft.id + "_" + nodeRight.id + "_" + strToInt(relation);
            edge = await this.nodeHandler.getEdgeByIdentifier(strToInt(edgeLookupKey));
    
            // If edge doesn't exist, create the edge
            if (!edge) {
                const edgeId = await this.nodeHandler.createEdgeWithId(nodeLeft.id, nodeRight.id, relation, edgeData, {}, ttld);

                edge = {
                    edgeId,
                    leftNodeId: nodeLeft.id, 
                    rightNodeId: nodeRight.id
                };
            } else {
                // If not, increase the depth 
                await this.nodeHandler.increaseEdgeDepthByEdgeId(edge.id);

                edge = {
                    edgeId: edge.id,
                    leftNodeId: edge.left_node_id,
                    rightNodeId: edge.right_node_id
                };
            }
        }

        const diff = new Date() - start;
        debug(`edge upsert took ${diff} ms`);

        return edge; 
    }
}

module.exports = GraphAccess;