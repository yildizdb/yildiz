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
        return await instance.factory.getStats() || {};
    });

    next();
};