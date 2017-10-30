"use strict";

const {
    get200ObjectSchema,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const SCHEMES = {
    EDGES: get200ObjectSchema({
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
                        properties: [] //TODO?
                    },
                    value: {
                        type: "string"
                    },
                    tdata: {
                        type: "object",
                        properties: [] //TODO?
                    }
                }
            }
        }
    })
};

module.exports = (instance, options, next) => {

    instance.post("/translated-edge-info", SCHEMES.EDGES, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const graphAccess = await krakn.getGraphAccess();

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

    next();
};