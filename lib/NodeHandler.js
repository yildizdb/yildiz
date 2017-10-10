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

    async removeNodeByIdentifier(identifier = ""){
        return await this._node.remove({
            where: {
                identifier
            }
        });
    }

    async edgeExists(firstIdentifier, secondIdentifier, relation = ""){

        const table = `${this.krakn.prefix}_edges`;

        const firstNode = `${this.krakn.prefix}NodeId`;
        const firstSubquery = `SELECT id FROM ${this.krakn.prefix}_nodes WHERE identifier = :first`;

        const secondNode = "otherNodeId";
        const secondSubquery = `SELECT id FROM ${this.krakn.prefix}_nodes WHERE identifier = :second`;

        const query = `SELECT id, data FROM ${table} WHERE ${firstNode} = (${firstSubquery}) AND ${secondNode} = (${secondSubquery}) AND relation LIKE :relation`;

        return await this.krakn.sequelize.query(query,{ 
                replacements: {
                    first: firstIdentifier,
                    second: secondIdentifier,
                    relation
                }, 
                type: this.krakn.sequelize.QueryTypes.SELECT 
            }).then(edges => {
                
                if(!edges || edges.length < 1){
                    return null;
                }

                return edges[0];
            });
    }

    async edgeExistsId(firstId, secondId, relation = ""){
        
        const table = `${this.krakn.prefix}_edges`;
        const firstNode = `${this.krakn.prefix}NodeId`;
        const secondNode = "otherNodeId";
        const query = `SELECT id, data FROM ${table} WHERE ${firstNode} = :first AND ${secondNode} = :second AND relation LIKE :relation`;

        return await this.krakn.sequelize.query(query,{ 
                replacements: {
                    first: firstId,
                    second: secondId, 
                    relation
                }, 
                type: this.krakn.sequelize.QueryTypes.SELECT 
            }).then(edges => {

                if(!edges || edges.length < 1){
                    return null;
                }

                return edges[0];
            });
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