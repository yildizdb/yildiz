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

    async createNode(properties = {}){
        const id = uuid.v4();
        const dbNode = await this._node.create(Object.assign(properties, {id}));
        debug("node created.", id);
        return new Node(this, dbNode);
    }

    async createEdge(firstNode, secondNode, attributes = {}){
        
        if(!firstNode || !secondNode || 
            !(firstNode instanceof Node) || !(secondNode instanceof Node)){
            throw new Error("node parameters must be of type Node.");
        }

        const id = uuid.v4();
        await firstNode.self.addOtherNode(secondNode.self, { through: Object.assign(attributes, {id})});
        debug("edge created.", id);
        return id;
    }

    async getNodeByPropertyField(field, value){

        const dbNode = await this._node.findOne({
            where: {
                [field]: value
            }
        });

        return new Node(this, dbNode);
    }

    async getNodesByPropertyField(field, value){
        
        const dbNodes = await this._node.findAll({
            where: {
                [field]: value
            }
        });

        return dbNodes.map(dbNode => new Node(this, dbNode));
    }
}

module.exports = NodeHandler;