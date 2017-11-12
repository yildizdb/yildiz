"use strict";

const {
    getPrefixHeader,
    getErrorObject,
    get2xxResponse
} = require("./../helper.js");

const TRANSLATE_SCHEMA = {
    identifier: {
        type: "number"
    },
    value: {
        type: "string"
    },
    data: {
        type: "object",
        additionalProperties: true
    },
    ttld: {
        type: "boolean"
    },
    created_at: {
        type: "string"
    }
};

const SCHEMES = {
    GET: {
        schema: {
            params: {
                identifier: {
                    type: "string"
                },
                required: ["identifier"]
            },
            response: get2xxResponse(TRANSLATE_SCHEMA)
        }
    },
    POST: {
        body: {
            value: {
                type: "string"
            },
            identifier: {
                type: "string"
            },
            data: {
                type: "object",
                additionalProperties: true
            },
            ttld: {
                type: "boolean"
            },
            required: ["value"]
        },
        schema: {
            response: get2xxResponse(TRANSLATE_SCHEMA)
        }
    },
    DELETE: {
        schema: {
            params: {
                identifier: {
                    type: "string"
                },
                required: ["identifier"]
            },
            response: get2xxResponse({
                success: {
                    type: "boolean"
                }
            })
        }
    }
};

module.exports = (instance, options, next) => {

    instance.get("/:identifier", SCHEMES.GET, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const translator = await krakn.getTranslator();

        let identifier = req.params.identifier;
        if(typeof identifier === "string"){
            identifier = instance.translator.strToInt(identifier);
        }

        return translator.getTranslation(identifier) || {};
    });

    instance.post("/translate-and-store", SCHEMES.POST, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const translator = await krakn.getTranslator();

        const body = req.body;

        const identifier = body.identifier || translator.strToInt(body.value); //convert identifier if its not set

        if (typeof identifier !== "number") {
            res.code(400);
            return getErrorObject("If identifier is present, it must be a number.", 400);
        }

        await translator.storeTranslation(identifier, body.value, body.data || {}, body.ttld);

        res.code(201);
        return {
            identifier,
            value: body.value,
            data: body.data,
            ttld: body.ttld
        };
    });

    instance.delete("/:identifier", SCHEMES.DELETE, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const translator = await krakn.getTranslator();

        let identifier = req.params.identifier;
        if(typeof identifier === "string"){
            identifier = instance.translator.strToInt(identifier);
        }

        const rows = await translator.removeTranslation(identifier);
        
        return {
            success: !!rows
        };
    });

    //TODO update translation

    next();
};