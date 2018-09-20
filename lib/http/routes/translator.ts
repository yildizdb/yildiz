import Debug from "debug";
import { FastifyInstance, RegisterOptions } from "fastify";
import { IncomingMessage, ServerResponse, Server } from "http";
import { NextFunction } from "express";

import { strToInt } from "./../../utils";
import { translatorSchema } from "./../schemas";
import {
  getPrefixHeader,
  getErrorObject,
} from "./../helper";

const debug = Debug("yildiz:routes:translator");

const SCHEMES = translatorSchema;

const translatorPath = (
  instance: FastifyInstance,
  options: RegisterOptions<Server, IncomingMessage, ServerResponse>,
  next: NextFunction) => {

    instance.get("/:identifier", SCHEMES.GET, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const translator = await yildiz.getTranslator();

        let identifier = req.params.identifier;
        if (typeof identifier === "string") {
            identifier = strToInt(identifier);
        }

        return await translator.getTranslation(identifier) || {};
    });

    instance.get("/counts", {}, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const translator = await yildiz.getTranslator();

        const counts = await translator.getTranslationCount();

        return {counts};
    });

    instance.post("/translate-and-store", SCHEMES.POST, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const translator = await yildiz.getTranslator();

        const body = req.body;

        // Convert identifier if its not set
        const identifier = body.identifier || translator.strToInt(body.value);

        if (!body.value || typeof body.value !== "string") {
            res.code(400);
            return getErrorObject("Value must be present and it must be a string.", 400);
        }

        if (typeof identifier !== "number") {
            res.code(400);
            return getErrorObject("If identifier is present, it must be a number.", 400);
        }

        try  {
            await translator.storeTranslation(identifier, body.value, body.data || {}, body.ttld);

            res.code(201);
            return {
                identifier,
                value: body.value,
                data: body.data,
                ttld: body.ttld,
            };
        } catch (error) {

            debug("Translation creation error", error);
            res.code(500);
            return {
                message: error.message,
            };
        }
    });

    instance.delete("/:identifier", SCHEMES.DELETE, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const translator = await yildiz.getTranslator();

        let identifier = req.params.identifier;
        if (typeof identifier === "string") {
            identifier = strToInt(identifier);
        }

        const rows = await translator.removeTranslation(identifier);

        return {
            success: !!rows,
        };
    });

    next();
};

export default translatorPath;
