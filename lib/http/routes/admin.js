"use strict";

const {get200ObjectSchema, get2xxResponse} = require("./../helper.js");

const SCHEMES = {
    HEALTH: get200ObjectSchema({
        status: { type: "string" }
    }),
    COUNTS: get200ObjectSchema({
        edges: { type: "number" },
        nodes: { type: "number" },
        ttls: { type: "number" }
    })
};

const {
    getPrefixHeader
} = require("./../helper.js");

module.exports = (instance, options, next) => {

    instance.get("/health", SCHEMES.HEALTH, (req, res) => {
        res.code(200).send({
            status: "UP"
        });
    });

    instance.get("/healthcheck", SCHEMES.HEALTH, (req, res) => {
        res.code(200).send();
    });

    instance.get("/metrics", {}, async (req, res) => {

        const registers = instance.factory.getAllMetricsRegisters();
        
        res.code(200)
            .header("Content-Type", registers.contentType)
            .send(registers.metrics());
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

    /*
    instance.get("/throw", {}, async (req, res) => {
        setTimeout(() => {
            throw new Error("throw endpoint error");
        }, 10);
    });

    instance.get("/sync-throw", {}, async (req, res) => {
        throw new Error("throw endpoint error");
    });

    instance.get("/reject", {}, async (req, res) => {
        await Promise.reject(new Error("throw endpoint error"));
    });
    */

    next();
};