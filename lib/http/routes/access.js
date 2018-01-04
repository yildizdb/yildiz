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

        return await graphAccess.upsertSingleEdgeRelationBetweenNodes(req.body);
    });

    next();
};