"use strict";

const {get200ObjectSchema, get2xxResponse} = require("./../helper.js");

const SCHEMES = {
    HEALTH: get200ObjectSchema({
        status: { type: "string" }
    }),
    STATS: {
        schema: {
            response: get2xxResponse(undefined, true)
        }
    }
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

    instance.get("/stats", SCHEMES.STATS, async (req, res) => {


        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);

        res.code(200);
        return await yildiz.getStats() || {};
    });

    instance.get("/metrics", {}, async (req, res) => {


        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);

        const metrics = yildiz.metrics;
        res
            .code(200)
            .header("Content-Type", metrics.exportType())
            .send(metrics.exportMetrics());
    });

    instance.get("/authcheck", {}, (req, res) => {
        res.code(200).send("Ok");
    });

    /**
     * Only for bigtable testing
     */

    instance.delete("/metadata", {}, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);

        if (!yildiz.metadata) {
            res.code(404);
        }

        await yildiz.metadata.purge();
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