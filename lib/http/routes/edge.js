"use strict";

const {
    get2xxResponse,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const EDGE_SCHEME = {
    depth: {
        type: "number"
    },
    relation: {
        type: "string"
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
                leftId: {
                    type: "number"
                },
                rightId: {
                    type: "number"
                },
                relation: {
                    type: "string"
                },
                required: ["leftId", "rightId", "relation"]
            },
            response: get2xxResponse(EDGE_SCHEME)
        }
    },
    POST: {
        body: {
            leftId: {
                type: "number"
            },
            rightId: {
                type: "number"
            },
            relation: {
                type: "string"
            },
            attributes: {
                type: "object",
                additionalProperties: true
            },
            _extend: {
                type: "object",
                additionalProperties: true
            },
            required: ["leftId", "rightId", "relation"]
        },
        schema: {
            response: get2xxResponse(EDGE_SCHEME)
        }
    },
    PUT_INC: {
        body: {
            leftId: {
                type: "number"
            },
            rightId: {
                type: "number"
            },
            relation: {
                type: "string"
            },
            required: ["leftId", "rightId", "relation"]
        },
        schema: {
            response: get2xxResponse({
                success: {
                    type: "boolean"
                }
            })
        }
    },
    PUT_DEC: {
        body: {
            leftId: {
                type: "number"
            },
            rightId: {
                type: "number"
            },
            relation: {
                type: "string"
            },
            required: ["leftId", "rightId", "relation"]
        },
        schema: {
            response: get2xxResponse({
                success: {
                    type: "boolean"
                }
            })
        }
    },
    DELETE: {
        schema: {
            params: {
                leftId: {
                    type: "number"
                },
                rightId: {
                    type: "number"
                },
                relation: {
                    type: "string"
                },
                required: ["leftId", "rightId", "relation"]
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

    instance.get("/:leftId/:rightId/:relation", SCHEMES.GET, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        if (!req.params.leftId || !req.params.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId param/s.", 400);
        }

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = instance.translator.strToInt(relation);
        }

        const edge = await nodeHandler.edgeExistsId(req.params.leftId, req.params.rightId, relation);

        if (!edge) {
            res.code(404);
            return getErrorObject("Edge with these ids and relation does not exist.", 404);
        }

        res.code(200);
        return edge;
    });

    instance.post("/", SCHEMES.POST, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if(typeof relation === "string"){
            relation = instance.translator.strToInt(relation);
        }

        let edge = null;
        try {
            edge = await nodeHandler.createEdgeWithId(body.leftId, body.rightId, relation,
                body.attributes, body._extend);
        } catch (error) {
            res.code(400);
            return getErrorObject(error.message, 400);
        }

        if (edge && edge.length && edge[0].length) {
            res.code(201);
            return edge[0][0].get();
        }

        res.code(501);
        return getErrorObject("Unknown error occured, edge result does not seem right.", 501);
    });

    instance.put("/depth/increase", SCHEMES.PUT_INC, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if(typeof relation === "string"){
            relation = instance.translator.strToInt(relation);
        }

        const inc = await nodeHandler.increaseEdgeDepthById(body.leftId, body.rightId, relation);

        if (inc && (inc.affectedRows || inc.changedRows)) {
            return {
                success: true
            };
        } else {
            return {
                success: false
            }
        }
    });

    instance.put("/depth/decrease", SCHEMES.PUT_DEC, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if(typeof relation === "string"){
            relation = instance.translator.strToInt(relation);
        }

        const dec = await nodeHandler.decreaseEdgeDepthById(body.leftId, body.rightId, relation);

        if (dec && (dec.affectedRows || dec.changedRows)) {
            return {
                success: true
            };
        } else {
            return {
                success: false
            }
        }
    });

    instance.delete("/:leftId/:rightId/:relation", SCHEMES.DELETE, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        if (!req.params.leftId || !req.params.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId param/s.", 400);
        }

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = instance.translator.strToInt(relation);
        }

        const result = await nodeHandler.removeEdgeByIds(req.params.leftId, req.params.rightId, relation);

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

    //TODO update edge

    next();
};