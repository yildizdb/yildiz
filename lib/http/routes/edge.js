"use strict";

const {
    get2xxResponse,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const EDGE_SCHEME = {
    id: {
        type: "number"
    },
    depth: {
        type: "number"
    },
    relation: {
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

const LEFT_EDGE_SCHEME = Object.assign({}, EDGE_SCHEME, {
    right_node_id: {
        type: "number"
    }
});

const RIGHT_EDGE_SCHEME = Object.assign({}, EDGE_SCHEME, {
    left_node_id: {
        type: "number"
    }
});

const BOTH_EDGE_SCHEME = Object.assign({}, EDGE_SCHEME, {
    right_node_id: {
        type: "number"
    },
    left_node_id: {
        type: "number"
    }
});

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
            ttld: {
                type: "boolean"
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
    },
    GET_LEFT: {
        schema: {
            params: {
                id: "number",
                relation: {
                    type: "string"
                },
                required: ["id", "relation"]
            },
            response: get2xxResponse({
                edges: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: LEFT_EDGE_SCHEME
                    }
                }
            })
        }
    },
    GET_RIGHT: {
        schema: {
            params: {
                id: "number",
                relation: {
                    type: "string"
                },
                required: ["id", "relation"]
            },
            response: get2xxResponse({
                edges: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: RIGHT_EDGE_SCHEME
                    }
                }
            })
        }
    },
    GET_BOTH: {
        schema: {
            params: {
                id: "number",
                relation: {
                    type: "string"
                },
                required: ["id", "relation"]
            },
            response: get2xxResponse({
                edges: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: BOTH_EDGE_SCHEME
                    }
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

        let insertCount = null;
        try {
            insertCount = await nodeHandler.createEdgeWithId(body.leftId, body.rightId, relation,
                body.attributes, body._extend, body.ttld);
        } catch (error) {
            res.code(400);
            return getErrorObject(error.message, 400);
        }

        if (insertCount) {
            res.code(201);
            return {
                success: true
            };
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

    instance.get("/left/:id/:relation", SCHEMES.GET_LEFT, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = instance.translator.strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForLeftNode(req.params.id, relation) || []
        };
    });

    instance.get("/right/:id/:relation", SCHEMES.GET_RIGHT, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = instance.translator.strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForRightNode(req.params.id, relation) || []
       };
    });

    instance.get("/both/:id/:relation", SCHEMES.GET_BOTH, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = instance.translator.strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForBothNode(req.params.id, relation) || []
        };
    });

    //TODO update edge

    next();
};