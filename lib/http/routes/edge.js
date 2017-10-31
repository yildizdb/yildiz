"use strict";

const {
    get200ObjectSchema,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const SCHEMES = {
    EDGE: get200ObjectSchema({
        depth: {
            type: "number"
        },
        relation: {
            type: "string"
        },
        data: {
            type: "object",
            properties: [] //TODO?
        }
    }),
    SUCCESS: get200ObjectSchema({
        success: {
            type: "boolean"
        }
    })
};

module.exports = (instance, options, next) => {

    instance.get("/:leftId/:rightId/:relation", SCHEMES.EDGE, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        if (!req.params.leftId || !req.params.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId param/s.", 400);
        }

        if (req.params.relation === "null" || req.params.relation === "false") {
            req.params.relation = "unknown";
        }

        const edge = await nodeHandler.edgeExistsId(req.params.leftId, req.params.rightId, req.params.relation);

        if (!edge) {
            res.code(404);
            return getErrorObject("Edge with these ids and relation does not exist.", 404);
        }

        res.code(200);
        return edge;
    });

    instance.post("/", SCHEMES.EDGE, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let edge = null;
        try {
            edge = await nodeHandler.createEdgeWithId(body.leftId, body.rightId, body.relation,
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

    instance.put("/depth/increase", SCHEMES.SUCCESS, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        const inc = await nodeHandler.increaseEdgeDepthById(body.leftId, body.rightId, body.relation);

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

    instance.put("/depth/decrease", SCHEMES.SUCCESS, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        const dec = await nodeHandler.decreaseEdgeDepthById(body.leftId, body.rightId, body.relation);

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

    instance.delete("/:leftId/:rightId/:relation", SCHEMES.SUCCESS, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const nodeHandler = await krakn.getNodeHandler();

        if (!req.params.leftId || !req.params.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId param/s.", 400);
        }

        if (req.params.relation === "null" || req.params.relation === "false") {
            req.params.relation = "unknown";
        }

        const result = await nodeHandler.removeEdgeByIds(req.params.leftId, req.params.rightId, req.params.relation);

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