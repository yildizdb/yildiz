"use strict";

const debug = require("debug")("krakn:nodehandler");
const uuid = require("uuid");

const Node = require("./Node.js");

class NodeHandler {

    constructor(krakn){
        this.krakn = krakn;
        this._node = this.krakn.models.Node;
        debug("created");
    }

    async createNode(identifier = "", properties = {}, _extend = {}){

        const id = uuid.v4();
        const nodeData = Object.assign(_extend, {
            id,
            identifier,
            data: properties
        });

        const dbNode = await this._node.create(nodeData);
        debug("node created.", id);
        return new Node(this, dbNode);
    }

    async removeNode(){
        //TODO
    }

    async edgeExists(){
        //TODO
        //return edge id
    }

    async createEdge(firstNode, secondNode, relation = "", attributes = {}, _extend = {}){
        
        if(!firstNode || !secondNode || 
            !(firstNode instanceof Node) || !(secondNode instanceof Node)){
            throw new Error("node parameters must be of type Node.");
        }

        const id = uuid.v4();
        const edgeData = Object.assign(_extend, {
            id,
            relation,
            data: attributes
        });

        await firstNode.self.addOtherNode(secondNode.self, { through: edgeData });
        debug("edge created.", id);
        return id;
    }

    async updateEdge(){
        //TOOD (transaction?)
    }

    async removeEdge(){
        //TODO
    }

    getNodeByIdentifier(identifier){
        return this.getNodeByPropertyField("identifier", identifier);
    }

    getNodesByIdentifier(identifier){
        return this.getNodesByPropertyField("identifier", identifier);
    }

    async getNodeByPropertyField(field, value){

        const dbNode = await this._node.findOne({
            attributes: { exclude: [`${this.krakn.prefix}_edge`] },
            where: {
                [field]: value
            }
        });

        return new Node(this, dbNode);
    }

    async getNodesByPropertyField(field, value){

        const dbNodes = await this._node.findAll({
            attributes: { exclude: [`${this.krakn.prefix}_edge`] },
            where: {
                [field]: value
            }
        });

        return dbNodes.map(dbNode => new Node(this, dbNode));
    }
}

module.exports = NodeHandler;