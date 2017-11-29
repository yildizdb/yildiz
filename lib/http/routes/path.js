"use strict";

const {
    get2xxResponse,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");

const SCHEMES = {
    SHORTEST: {
        schema: {
            body: {
                start: {
                    type: "number"
                },
                end: {
                    type: "number"
                },
                required: ["start", "end"]
            },
            response: get2xxResponse({
                paths: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: true
                    }
                }
            })
        }
    }
};

module.exports = (instance, options, next) => {

    instance.post("/shortest-path", SCHEMES.SHORTEST, async(req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);

        const body = req.body;

        //TODO enable on MySQL 8
        //const paths = await krakn.dijkstra.executeProcedureVersion1(prefix, body.start, body.end);

        return {
            paths: []
        };
    });

    next();
};