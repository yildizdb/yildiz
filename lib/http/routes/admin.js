"use strict";

const {get200ObjectSchema} = require("./../helper.js");

const SCHEMES = {
    HEALTH: get200ObjectSchema({
        status: { type: "string" }
    })
};

module.exports = (instance, options, next) => {

    instance.get("/health", SCHEMES.HEALTH, (req, res) => {
        res.send({
            status: "UP"
        });
    });

    next();
};