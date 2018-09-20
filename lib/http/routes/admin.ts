import { FastifyInstance, RegisterOptions } from "fastify";
import { IncomingMessage, Server, ServerResponse } from "http";
import { NextFunction } from "express";

import { getPrefixHeader } from "./../helper";
import { adminSchema } from "./../schemas";
import { Registry } from "prom-client";

const SCHEMES = adminSchema;

const adminRoute = (
    instance: FastifyInstance,
    options: RegisterOptions<Server, IncomingMessage, ServerResponse>,
    next: NextFunction) => {

    instance.get("/health", SCHEMES.HEALTH, (req, res) => {
        res.code(200).send({
            status: "UP",
        });
    });

    instance.get("/healthcheck", SCHEMES.HEALTH, (req, res) => {
        res.code(200).send();
    });

    instance.get("/metrics", {}, async (req, res) => {

        const registers = instance.factory.getAllMetricsRegisters();
        const metrics = (registers as Registry).metrics && (registers as Registry).metrics() || "";
        const contentType =  (registers as Registry).contentType || "text/plain; version=0.0.4; charset=utf-8";

        res.code(200)
            .header("Content-Type", contentType)
            .send(metrics);
    });

    instance.get("/authcheck", {}, (req, res) => {
        res.code(200).send("Ok");
    });

    // Only for bigtable
    instance.get("/metadata/counts", SCHEMES.COUNTS, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);

        if (!yildiz.metadata) {
            res.code(404);
        }

        const counts = await yildiz.metadata.getAllCount();
        res.code(200).send(counts);
    });

    instance.post("/reset-tables", {}, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);

        await yildiz.resetTables();
        res.code(200).send("Ok");
    });

    next();
};

export default adminRoute;
