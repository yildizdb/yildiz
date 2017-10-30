"use strict";

const {get200ObjectSchema} = require("./../helper.js");

const SCHEMES = {
    HEALTH: get200ObjectSchema({
        status: { type: "string" }
    })
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

    next();
};