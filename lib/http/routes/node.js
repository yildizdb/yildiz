"use strict";

const debug = require("debug")("yildiz:routes:node");

const {
    get2xxResponse,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const {
    strToInt
} = require("./../../utils/index.js");

const NODE_SCHEME = {
    id: {
        type: "number"
    },
    identifier: {
        type: "string"
    },
    data: {
        type: "object",
        additionalProperties: true
    },
    ttld: {
        type: "boolean"
    },
    created_at: {
        type: "string"
    }
};

const SCHEMES = {
    GET: {
        schema: {
            params: {
                identifier: {
                    type: "string"
                },
                required: ["identifier"]
            },
            response: get2xxResponse(NODE_SCHEME)
        }
    },
    POST: {
        body: {
            identifier: {
                type: "string"
            },
            data: {
                type: "object",
                additionalProperties: true
            },
            _extend: {
                type: "object",
                additionalProperties: true
            },
            ttld: {
                type: "boolean"
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
                    type: "string"
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
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let identifier = req.params.identifier;
        if(typeof identifier === "string"){
            identifier = strToInt(identifier);
        }

        const node = await nodeHandler.getNodeByIdentifier(identifier);

        if(!node){
            res.code(404);
            return getErrorObject("No node found for identifier " + req.params.identifier, 404);
        }

        return node.getFull();
    });

    instance.post("/", SCHEMES.POST, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const body = req.body;

        if(!body || !body.identifier){
            res.code(400);
            return getErrorObject("Missing identifier.", 400);
        }

        let identifier = body.identifier;
        if(typeof identifier === "string"){
            identifier = strToInt(identifier);
        }

        try  {
            const node = await nodeHandler.createNode(identifier, 
                body.data || {},
                body._extend || {}, 
                body.ttld);

            res.code(201);
            return node.getFull();
        } catch(error){

            if(error.message === "Validation error" &&
                error.name === "SequelizeUniqueConstraintError"){

                    let description = "";
                    Object.keys(error.fields).forEach(key => {
                        description += `${key} -> ${error.fields[key]}, `;
                    });

                    const message = `Unique constraint error, for fields: ${description}`;
                    debug(message);

                    res.code(409);
                    return {
                        message
                    };
            }

            debug("Node creation error", error);
            res.code(500);
            return {
                message: error.message
            };
        }
    });

    instance.delete("/:identifier", SCHEMES.DELETE, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let identifier = req.params.identifier;
        if(typeof identifier === "string"){
            identifier = strToInt(identifier);
        }

        const result = await nodeHandler.removeNode(identifier);
        
        if (result && (result.affectedRows || result.changedRows || result.rowCount)) {
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