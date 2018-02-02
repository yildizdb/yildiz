"use strict";

const {
    get2xxResponse,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const {
    strToInt
} = require("./../../utils/index.js");

const EDGE_SCHEME = {
    id: {
        type: "string"
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
                /*id: {
                    type: "number"
                },*/
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
                /*id: {
                    type: "number"
                },*/
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
                /*id: {
                    type: "number"
                },*/
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
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        if (!req.params.leftId || !req.params.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId param/s.", 400);
        }

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = strToInt(relation);
        }

        const edge = await nodeHandler.edgeExistsId(req.params.leftId, req.params.rightId, relation);

        if (!edge) {
            res.code(404);
            return getErrorObject("Edge with these ids and relation does not exist.", 404);
        }

        res.code(200);
        return edge;
    });

    instance.get("/count", {}, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const counts = await nodeHandler.getEdgeCount();

        return {counts};
    });

    instance.post("/", SCHEMES.POST, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if(typeof relation === "string"){
            relation = strToInt(relation);
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
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if(typeof relation === "string"){
            relation = strToInt(relation);
        }

        const inc = await nodeHandler.increaseEdgeDepthById(body.leftId, body.rightId, relation);
        return inc;
    });

    instance.put("/depth/decrease", SCHEMES.PUT_DEC, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if(typeof relation === "string"){
            relation = strToInt(relation);
        }

        const dec = await nodeHandler.decreaseEdgeDepthById(body.leftId, body.rightId, relation);
        return dec;
    });

    instance.delete("/:leftId/:rightId/:relation", SCHEMES.DELETE, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        if (!req.params.leftId || !req.params.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId param/s.", 400);
        }

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = strToInt(relation);
        }

        const result = await nodeHandler.removeEdgeByIds(req.params.leftId, req.params.rightId, relation);

        if (yildiz.config.database.dialect !== "bigtable") {
            if (result && (result.affectedRows || result.changedRows || result.rowCount)) {
                return {
                    success: true
                };
            } else {
                return {
                    success: false
                }
            }
        }
        else {
            if (result) {
                return {
                    success: true
                };
            }
            else {
                return {
                    success: false
                };
            }
        }
    });

    instance.get("/left/:id/:relation", SCHEMES.GET_LEFT, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForLeftNode(req.params.id, relation) || []
        };
    });

    instance.get("/right/:id/:relation", SCHEMES.GET_RIGHT, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForRightNode(req.params.id, relation) || []
       };
    });

    instance.get("/both/:id/:relation", SCHEMES.GET_BOTH, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let relation = req.params.relation;
        if(typeof relation === "string"){
            relation = strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForBothNode(req.params.id, relation) || []
        };
    });

    //TODO update edge

    next();
};