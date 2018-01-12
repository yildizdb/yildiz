"use strict";

const {
    getPrefixHeader,
    get2xxResponse
} = require("./../helper.js");

const SCHEMES = {
    QUERY: {
        body: {
            query: {
                type: "string"
            },
            replacements: {
                type: "object",
                additionalProperties: true
            },
            required: ["query"]
        },
        schema: {
            response: get2xxResponse({
                results: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: true
                    }
                }
            })
        }
    },
    SPREAD: {
        body: {
            query: {
                type: "string"
            },
            replacements: {
                type: "object",
                additionalProperties: true
            },
            required: ["query"]
        },
        schema: {
            response: get2xxResponse({
                metadata: {
                    type: "object",
                    additionalProperties: true
                }
            })
        }
    }
};

module.exports = (instance, options, next) => {

    instance.post("/query", SCHEMES.QUERY, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        
        const body = req.body;

        res.code(200);
        return {
            results: await yildiz.raw(body.query, body.replacements || {}) || []
        };
    });

    instance.post("/spread", SCHEMES.SPREAD, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        
        const body = req.body;

        const meta = await yildiz.spread(body.query, body.replacements || {});
        
        if ("rowCount" in meta) {
            Object.keys(meta).forEach(x => {
                typeof meta[x] === "function" && delete meta[x];
            });
        }
        return {
            metadata: meta || []
        };
    });

    next();
};