"use strict";

const {
    get2xxResponse,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const NODE_SCHEME = {
    identifier: {
        type: "string"
    },
    id: {
        type: "number"
    },
    data: {
        type: "object",
        additionalProperties: true
    }
};

const SCHEMES = {
    GET: {
        schema: {
            params: {
                identifier: {
                    type: "number"
                },
                required: ["identifier"]
            },
            response: get2xxResponse(NODE_SCHEME)
        }
    },
    POST: {
        body: {
            identifier: {
                type: "number"
            },
            data: {
                type: "object",
                additionalProperties: true
            },
            _extend: {
                type: "object",
                additionalProperties: true
            },
            required: ["identifier"]
        },
        schema: {
            response: get2xxResponse(NODE_SCHEME)
        }
    },
    DELETE: {
        schema: {
            params: {
                identifier: {
                    type: "number"
                },
                required: ["identifier"]
            },
            response: get2xxResponse({
                success: {
                    type: "boolean"
                }
            })
        }
    }
};

module.exports = (instance, options, next) => {

    instance.get("/:identifier", SCHEMES.GET, async (req, res) => {

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

    instance.post("/", SCHEMES.POST, async (req, res) => {
        
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

    instance.delete("/:identifier", SCHEMES.DELETE, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const result = await nodeHandler.removeNode(req.params.identifier);
        
        if (result && (result.affectedRows || result.changedRows)) {
            return {
                success: true
            };
        } else {
            return {
                success: false
            }
        }
    });

    //TODO update node

    next();
};