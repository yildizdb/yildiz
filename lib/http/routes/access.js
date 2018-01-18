"use strict";

const {
    get2xxResponse,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const SCHEMES = {
    EDGES: {
        schema: {
            body: {
                values: {
                    type: "array",
                    items: {
                        type: "string"
                    }
                },
                required: ["values"]
            },
            response: get2xxResponse({
                edges: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            other_node_id: {
                                type: "number"
                            },
                            relation: {
                                type: "string"
                            },
                            depth: {
                                type: "number"
                            },
                            edata: {
                                type: "object",
                                additionalProperties: true
                            },
                            value: {
                                type: "string"
                            },
                            tdata: {
                                type: "object",
                                additionalProperties: true
                            }
                        }
                    }
                }
            })
        }
    },
    SC_RELATION: {
        schema: {
            body: {
                leftNodeIdentifierVal: {
                    type: "string"
                },
                rightNodeIdentifierVal: {
                    type: "string"
                }, 
                leftNodeData: {
                    type: "object",
                    additionalProperties: true
                }, 
                rightNodeData: {
                    type: "object",
                    additionalProperties: true
                },
                ttld: {
                    type: "boolean"
                }, 
                relation: {
                    type: "string"
                }, 
                edgeData: {
                    type: "object",
                    additionalProperties: true
                }, 
                depthBeforeCreation: {
                    type: "boolean"
                },
                required: [
                    "leftNodeIdentifierVal", "rightNodeIdentifierVal", "leftNodeData", "rightNodeData",
                    "ttld", "relation", "edgeData", "depthBeforeCreation"
                ]
            },
            response: get2xxResponse(undefined, true)
        }
    }
};

module.exports = (instance, options, next) => {

    instance.post("/translated-edge-info", SCHEMES.EDGES, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const graphAccess = await yildiz.getGraphAccess();

        const body = req.body;

        if (!body || !body.values) {
            res.code(400);
            return getErrorObject("Missing values field on body.", 400);
        }

        if (!Array.isArray(body.values)) {
            res.code(400);
            return getErrorObject("values must be an array.", 400);
        }

        const edges = await graphAccess.edgeInfoForNodesRelatingToTranslateValues(body.values);

        return {
            edges
        };
    });

    instance.post("/upsert-singular-relation", SCHEMES.SC_RELATION, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const graphAccess = await yildiz.getGraphAccess();

        try {
            const result = await runUpsertRelationWithSingleRetryOnDeadlock(graphAccess, req.body, true);
            return result;
        } catch(error){

            if(error.message.indexOf("SequelizeUniqueConstraintError") !== -1){
                res.code(409);
                res.header("content-type", "application/json");
                return {
                    error: "SequelizeUniqueConstraintError during procedure call.",
                    stack: null
                };
            } else if(error.message.indexOf("Deadlock") !== -1){
                res.code(500);
                res.header("content-type", "application/json");
                return {
                    error: "Procedure failed with deadlock, even after retry.",
                    stack: null
                };
            } else {
                res.code(500);
                res.header("content-type", "application/json");
                return {
                    error: error.message,
                    stack: error.stack
                };
            }
        }
    });

    instance.post("/upsert-singular-relation-no-transaction", SCHEMES.SC_RELATION, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const graphAccess = await yildiz.getGraphAccess();

        try {
            const result = await runUpsertRelationWithSingleRetryOnDeadlock(graphAccess, req.body, false);
            return result;
        } catch(error){

            if(error.message.indexOf("SequelizeUniqueConstraintError") !== -1){
                res.code(409);
                res.header("content-type", "application/json");
                return {
                    error: "SequelizeUniqueConstraintError during procedure call.",
                    stack: null
                };
            } else if(error.message.indexOf("Deadlock") !== -1){
                res.code(500);
                res.header("content-type", "application/json");
                return {
                    error: "Procedure failed with deadlock, even after retry.",
                    stack: null
                };
            } else {
                res.code(500);
                res.header("content-type", "application/json");
                return {
                    error: error.message,
                    stack: error.stack
                };
            }
        }
    });

    next();
};

const runUpsertRelationWithSingleRetryOnDeadlock = (graphAccess, requestBody, withTransaction) => {
    return new Promise((resolve, reject) => {
        _runUpsertRelationWithSingleRetryOnDeadlock(graphAccess, requestBody, withTransaction, 0, (error, result) => {
            
            if(error){
                return reject(error);
            }

            resolve(result);
        });
    });
};

const _runUpsertRelationWithSingleRetryOnDeadlock = (graphAccess, requestBody, withTransaction, retries = 0, callback = null) => {
    graphAccess.upsertSingleEdgeRelationBetweenNodes(requestBody, withTransaction)
        .then(result => callback(null, result))
        .catch(error => {

            //only retry once on deadlock error
            if(retries !== 0 || error.message.indexOf("Deadlock") !== -1){
                return callback(error);
            }

            return _runUpsertRelationWithSingleRetryOnDeadlock(graphAccess, requestBody, withTransaction, 1, callback);
        })
};