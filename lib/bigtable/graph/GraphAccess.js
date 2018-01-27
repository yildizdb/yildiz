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
            return Promise.reject(new Error("values must be an array"));
        }

        if(!values.length){
            return Promise.reject(new Error("values should not be empty"));
        }

        this._incStat("edge_info_nodes_translates");

        values = values.map(val => val + "");

        // Get the node ids from translates value
        const nodeIds = await Promise.all(
            values.map(n => this.translator.getTranslationFromValue(n))
        );

        // If no presumed node id found, return empty array 
        if (!nodeIds.length) {
            return [];
        }

        // From the presumed node id, check the nodes table and get the edges id
        const nodeRaws = await Promise.all(
            nodeIds.map(n => this.nodeHandler.getNodeByIdentifier(n))
        );
        const nodes = nodeRaws.map(n => n.getFull());

        // Get the edgeIds from nodes, and clean it
        const edgeIdsRaw = nodes.map(x => x.edges);
        const edgeIds =  [].concat.apply([], edgeIdsRaw.map(x => x.split(",")))
            .filter(x => x !== "")
            .filter((item, pos, self) => self.indexOf(item) === pos);

        // Get the edges from the id
        const edges = await Promise.all(
            edgeIds.map(n => this.nodeHandler.getEdgeByIdentifier(n))
        );

        return edges;
    }

    async upsertSingleEdgeRelationBetweenNodes(body, withTransaction = true){

        const start = new Date();

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

        // Firstly, check the Translation exists for both nodes
        let presumedNodeLeft = await this.translator.getTranslationFromValue(leftNodeIdentifierVal);
        let presumedNodeRight = await this.translator.getTranslationFromValue(rightNodeIdentifierVal);

        // If it doesn't exist, create new translations
        if (!presumedNodeLeft) {
            presumedNodeLeft = strToInt(leftNodeIdentifierVal);
            await this.translator.storeTranslation(presumedNodeLeft, leftNodeIdentifierVal, {}, ttld);
        }
        if (!presumedNodeRight) {
            presumedNodeRight = strToInt(rightNodeIdentifierVal);
            await this.translator.storeTranslation(presumedNodeRight, rightNodeIdentifierVal, {}, ttld);
        }

        // Check node table from the presumed id from translates table if they exist
        let nodeLeft = (await this.nodeHandler.getNodeByIdentifier(presumedNodeLeft + "")).getFull();
        let nodeRight = (await this.nodeHandler.getNodeByIdentifier(presumedNodeRight + "")).getFull();
        
        // If the nodes don't exist create them
        if (!nodeLeft) {
            nodeLeft = (await this.nodeHandler.createNode(presumedNodeLeft + "", leftNodeData, {}, ttld)).getFull();
        }
        if (!nodeRight) {
            nodeRight = (await this.nodeHandler.createNode(presumedNodeRight + "", rightNodeData, {}, ttld)).getFull();
        }

        // If NOT depthBeforeCreation, simply create a new edge
        let edge = null;

        if (!depthBeforeCreation) {
            const edgeId = await this.nodeHandler.createEdgeWithId(nodeLeft.id, nodeRight.id, relation, edgeData, {}, ttld);
            edge = await this.nodeHandler.getEdgeByIdentifier(edgeId);
        }
        // If depthBeforeCreation get the edge
        else {

            edge = await this.nodeHandler.edgeExistsId(nodeLeft.id, nodeRight.id);
    
            // If edge doesn't exist, create the edge
            if (!edge) {
                const edgeId = await this.nodeHandler.createEdgeWithId(nodeLeft.id, nodeRight.id, relation, edgeData, {}, ttld);
                edge = await this.nodeHandler.getEdgeByIdentifier(edgeId);
            }
            // If not, increase the depth 
            else {
                await this.nodeHandler.increaseEdgeDepthById(nodeLeft.id, nodeRight.id);
            }
            
        }

        // Clean up to comply with the schema
        edge.leftNodeId = edge.left_node_id || null;
        edge.rightNodeId = edge.right_node_id || null;
        edge.edgeId = edge.id;

        delete edge.left_node_id;
        delete edge.right_node_id;
        delete edge.id;
        delete edge.identifier;

        const diff = new Date() - start;
        debug(`edge upsert took ${diff} ms`);

        return edge; 
    }
}

module.exports = GraphAccess;