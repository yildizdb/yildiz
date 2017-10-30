"use strict";

const {
    get200ObjectSchema,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const SCHEMES = {
    NODE: get200ObjectSchema({
        identifier: {
            type: "string"
        },
        id: {
            type: "number"
        },
        data: {
            type: "object"
        }
    })
};

module.exports = (instance, options, next) => {

    instance.get("/:identifier", SCHEMES.NODE, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const node = await nodeHandler.getNodeByIdentifier(req.params.identifier);

        if(!node){
            res.code(404);
            return getErrorObject("No node found for identifier " + req.params.identifier, 404);
        }

        return node.getFull();
    });

    instance.post("/", SCHEMES.NODE, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const body = req.body;

        if(!body || !body.identifier){
            res.code(400);
            return getErrorObject("Missing identifier.", 400);
        }

        const node = await nodeHandler.createNode(body.identifier, 
            body.data || {},
            body._extend || {});

        res.code(201);
        return node.getFull();
    });

    //TODO update node
    //TODO delete node

    next();
};