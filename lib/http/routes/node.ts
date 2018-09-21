import { FastifyInstance, RegisterOptions } from "fastify";
import { IncomingMessage, Server, ServerResponse } from "http";
import { NextFunction } from "express";
import Debug from "debug";

import { strToInt } from "./../../utils";
import { nodeSchema } from "./../schemas";
import {
    getPrefixHeader,
    getErrorObject,
} from "./../helper";

const debug = Debug("yildiz:routes:node");

const SCHEMES = nodeSchema;

const nodeRoute = (
    instance: FastifyInstance,
    options: RegisterOptions<Server, IncomingMessage, ServerResponse>,
    next: NextFunction) => {

    instance.get("/:identifier", SCHEMES.GET, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let identifier = req.params.identifier;
        if (typeof identifier === "string") {
            identifier = strToInt(identifier);
        }

        const node = await nodeHandler.getNodeByIdentifier(identifier);

        if (!node) {
            res.code(404);
            return getErrorObject("No node found for identifier " + req.params.identifier, 404);
        }

        return node;
    });

    instance.get("/counts", {}, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const counts = await nodeHandler.getNodeCount();

        return {counts};
    });

    instance.post("/", SCHEMES.POST, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        const body = req.body;

        if (!body || !body.identifier) {
            res.code(400);
            return getErrorObject("Missing identifier.", 400);
        }

        let identifier = body.identifier;
        if (typeof identifier === "string") {
            identifier = strToInt(identifier);
        }

        try  {
            const node = await nodeHandler.createNode(identifier,
                body.data || {},
                body._extend || {},
                body.ttld,
                body.value);

            res.code(201);

            if (node && node.getFull) {
                return node.getFull();
            }

            return node;
        } catch (error) {

            debug("Node creation error", error);
            res.code(500);
            return {
                message: error.message,
            };
        }
    });

    instance.delete("/:identifier", SCHEMES.DELETE, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const nodeHandler = await yildiz.getNodeHandler();

        let identifier = req.params.identifier;
        if (typeof identifier === "string") {
            identifier = strToInt(identifier);
        }

        const result = await nodeHandler.removeNode(identifier);

        if (result) {
            return {
                success: true,
            };
        } else {
            return {
                success: false,
            };
        }
    });

    next();
};

export default nodeRoute;
