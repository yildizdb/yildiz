"use strict";

const {
    get2xxResponse,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const {
    strToInt
} = require("./../../utils/index.js");

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
                identifiers: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: true
                    }
                },
                nodes: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: true
                    }
                },
                edges: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: true
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

        const result = await graphAccess.edgeInfoForNodesRelatingToTranslateValues(body.values);
        return result;
    });

    instance.post("/upsert-singular-relation", SCHEMES.SC_RELATION, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const graphAccess = await yildiz.getGraphAccess();

        try {
            const result = await runUpsertRelationWithSingleRetryOnDeadlock(yildiz, graphAccess, req.body, true);
            return result;
        } catch(error){

            if(error.message.indexOf("SequelizeUniqueConstraintError") !== -1){
                yildiz.incStat("total_upsert_relation_contraint_error");
                res.code(409);
                res.header("content-type", "application/json");
                return {
                    error: "SequelizeUniqueConstraintError during procedure call.",
                    stack: null
                };
            } else if(error.message.indexOf("Deadlock") !== -1){
                yildiz.incStat("total_upsert_relation_deadlock");
                res.code(500);
                res.header("content-type", "application/json");
                return {
                    error: "Procedure failed with deadlock, even after retry.",
                    stack: null
                };
            } else {
                yildiz.incStat("total_upsert_relation_error");
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
            const result = await runUpsertRelationWithSingleRetryOnDeadlock(yildiz, graphAccess, req.body, false);
            return result;
        } catch(error){

            if(error.message.indexOf("SequelizeUniqueConstraintError") !== -1){
                yildiz.incStat("total_upsert_relation_contraint_error");
                res.code(409);
                res.header("content-type", "application/json");
                return {
                    error: "SequelizeUniqueConstraintError during procedure call.",
                    stack: null
                };
            } else if(error.message.indexOf("Deadlock") !== -1){
                yildiz.incStat("total_upsert_relation_deadlock");
                res.code(500);
                res.header("content-type", "application/json");
                return {
                    error: "Procedure failed with deadlock, even after retry.",
                    stack: null
                };
            } else {
                yildiz.incStat("total_upsert_relation_error");
                res.code(500);
                res.header("content-type", "application/json");
                return {
                    error: error.message,
                    stack: error.stack
                };
            }
        }
    });

    instance.delete("/node/:identifier", SCHEMES.DELETE, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);

        if (yildiz.config.database.dialect !== "bigtable") {

            res.code(405);
            return {
                message: "Not implemented here"
            };
        }

        const nodeHandler = await yildiz.getNodeHandler();

        let identifier = req.params.identifier;

        if(typeof identifier === "string"){
            identifier = strToInt(identifier);
        }

        const result = await nodeHandler.removeNodeComplete(identifier);

        if (!result) {
            return {
                success: false
            };
        }

        return {
            success: true
        };
    });

    next();
};

const runUpsertRelationWithSingleRetryOnDeadlock = (yildiz, graphAccess, requestBody, withTransaction) => {
    return new Promise((resolve, reject) => {
        _runUpsertRelationWithSingleRetryOnDeadlock(yildiz, graphAccess, requestBody, withTransaction, 0, (error, result) => {
            
            if(error){
                return reject(error);
            }

            resolve(result);
        });
    });
};

const _runUpsertRelationWithSingleRetryOnDeadlock = (yildiz, graphAccess, requestBody, withTransaction, retries = 0, callback = null) => {
    graphAccess.upsertSingleEdgeRelationBetweenNodes(requestBody, withTransaction)
        .then(result => callback(null, result))
        .catch(error => {

            //only retry once on deadlock error
            if(retries !== 0 && error.message.indexOf("Deadlock") !== -1){
                yildiz.incStat("total_upsert_relation_deadlock");
                return callback(error);
            }

            return _runUpsertRelationWithSingleRetryOnDeadlock(yildiz, graphAccess, requestBody, withTransaction, 1, callback);
        })
};