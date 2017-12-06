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
        res.code(200);
        return await instance.getStats() || {};
    });

    instance.get("/metrics", {}, (req, res) => {
        const metrics = instance.metrics;
        res
            .code(200)
            .header("Content-Type", metrics.exportType())
            .send(metrics.exportMetrics());
    });

    next();
};