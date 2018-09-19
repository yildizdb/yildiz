import { FastifyInstance, RegisterOptions } from "fastify";
import { IncomingMessage, Server, ServerResponse } from "http";
import { NextFunction } from "express";

import {
    getPrefixHeader,
    getErrorObject,
} from "./../helper";

import { strToInt } from "./../../utils";
import { edgeSchema } from "./../schemas";

const SCHEMES = edgeSchema;

const edgeRoute = (
    instance: FastifyInstance,
    options: RegisterOptions<Server, IncomingMessage, ServerResponse>,
    next: NextFunction) => {

    instance.get("/:leftId/:rightId/:relation", SCHEMES.GET, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        if (!req.params.leftId || !req.params.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId param/s.", 400);
        }

        let relation = req.params.relation;
        if (typeof relation === "string") {
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

    instance.get("/counts", {}, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const counts = await nodeHandler.getEdgeCount();

        return {counts};
    });

    instance.post("/", SCHEMES.POST, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if (typeof relation === "string") {
            relation = strToInt(relation);
        }

        let insertCount = null;
        try {
            insertCount = await nodeHandler.createEdgeWithId(body.leftId, body.rightId, relation,
                body.attributes, body._extend, body.ttld, body.depthBeforeCreation, body.isPopularRightNode);
        } catch (error) {
            res.code(400);
            return getErrorObject(error.message, 400);
        }

        if (insertCount) {
            res.code(201);
            return {
                success: true,
            };
        }

        res.code(501);
        return getErrorObject("Unknown error occured, edge result does not seem right.", 501);
    });

    instance.put("/depth/increase", SCHEMES.PUT_INC, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if (typeof relation === "string") {
            relation = strToInt(relation);
        }

        const inc = await nodeHandler.increaseEdgeDepthById(body.leftId, body.rightId, relation);
        return inc;
    });

    instance.put("/depth/decrease", SCHEMES.PUT_DEC, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const body = req.body;

        if (!body || !body.leftId || !body.rightId) {
            res.code(400);
            return getErrorObject("Missing leftId or rightId fields on body.", 400);
        }

        let relation = body.relation;
        if (typeof relation === "string") {
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
        if (typeof relation === "string") {
            relation = strToInt(relation);
        }

        const result = await nodeHandler.removeEdgeByIds(req.params.leftId, req.params.rightId, relation);

        if (!result) {
            return { success: false };
        }

        return { success: true };
    });

    instance.get("/left/:id/:relation", SCHEMES.GET_LEFT, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let relation = req.params.relation;
        if (typeof relation === "string") {
            relation = strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForLeftNode(req.params.id, relation) || [],
        };
    });

    instance.get("/right/:id/:relation", SCHEMES.GET_RIGHT, async (req, res) => {
        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let relation = req.params.relation;
        if (typeof relation === "string") {
            relation = strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForRightNode(req.params.id, relation) || [],
       };
    });

    instance.get("/both/:id/:relation", SCHEMES.GET_BOTH, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let relation = req.params.relation;
        if (typeof relation === "string") {
            relation = strToInt(relation);
        }

        return {
            edges: await nodeHandler.getEdgesForBothNode(req.params.id, relation) || [],
        };
    });

    next();
};

export default edgeRoute;
