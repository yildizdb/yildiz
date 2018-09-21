import { FastifyInstance, RegisterOptions } from "fastify";
import { IncomingMessage, Server, ServerResponse } from "http";
import { NextFunction } from "express";

import { accessSchema } from "./../schemas";
import { strToInt } from "./../../utils";
import {
    getPrefixHeader,
    getErrorObject,
} from "./../helper";

const SCHEMES = accessSchema;

const accessRouter = (
    instance: FastifyInstance,
    options: RegisterOptions<Server, IncomingMessage, ServerResponse>,
    next: NextFunction) => {

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

        if (yildiz.config.database.dialect === "bigtable") {
            graphAccess.setLastAccessFireAndForget(body.values);
        }

        if (!result) {
            res.code(404);
            return getErrorObject("No relations found for the identifiers " + body.values, 404);
        }

        return result;
    });

    instance.post("/upsert-singular-relation", SCHEMES.SC_RELATION, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const graphAccess = await yildiz.getGraphAccess();

        try {
            const result = await graphAccess.runUpsertRelationWithRetry(req.body);
            return result;
        } catch (error) {

            yildiz.incStat("total_upsert_relation_error");
            res.code(500);
            res.header("content-type", "application/json");
            return {
                error: error.message,
                stack: error.stack,
            };
        }
    });

    instance.post("/upsert-singular-relation-no-transaction", SCHEMES.SC_RELATION, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const graphAccess = await yildiz.getGraphAccess();

        try {
            const result = await graphAccess.runUpsertRelationWithRetry(req.body);
            return result;
        } catch (error) {

            yildiz.incStat("total_upsert_relation_error");
            res.code(500);
            res.header("content-type", "application/json");
            return {
                error: error.message,
                stack: error.stack,
            };
        }
    });

    instance.delete("/node/:identifier", SCHEMES.DELETE_NODE_RELATION, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);

        if (yildiz.config.database.dialect !== "bigtable") {

            res.code(405);
            return {
                message: "Not implemented here",
            };
        }

        const nodeHandler = await yildiz.getNodeHandler();

        let identifier = req.params.identifier;

        if (typeof identifier === "string") {
            identifier = strToInt(identifier);
        }

        const result = await nodeHandler.removeNodeComplete(identifier);

        if (!result) {
            return {
                success: false,
            };
        }

        return {
            success: true,
        };
    });

    next();
};

export default accessRouter;
