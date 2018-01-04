"use strict";

const debug = require("debug")("yildiz:routes:translator");

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
        const yildiz = await instance.factory.get(prefix);
        const translator = await yildiz.getTranslator();

        let identifier = req.params.identifier;
        if(typeof identifier === "string"){
            identifier = instance.translator.strToInt(identifier);
        }

        return translator.getTranslation(identifier) || {};
    });

    instance.post("/translate-and-store", SCHEMES.POST, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const translator = await yildiz.getTranslator();

        const body = req.body;

        const identifier = body.identifier || translator.strToInt(body.value); //convert identifier if its not set

        if(!body.value || typeof body.value !== "string"){
            res.code(400);
            return getErrorObject("Value must be present and it must be a string.", 400);
        }

        if (typeof identifier !== "number") {
            res.code(400);
            return getErrorObject("If identifier is present, it must be a number.", 400);
        }

        try  {
            await translator.storeTranslation(identifier, body.value, body.data || {}, body.ttld);

            res.code(201);
            return {
                identifier,
                value: body.value,
                data: body.data,
                ttld: body.ttld
            };
        } catch(error){

            if(error.message === "Validation error" &&
                error.name === "SequelizeUniqueConstraintError"){

                    let description = "";
                    Object.keys(error.fields).forEach(key => {
                        description += `${key} -> ${error.fields[key]}, `;
                    });

                    const message = `Unique constraint error, for fields: ${description}`;
                    debug(message);

                    res.code(409);
                    return {
                        message
                    };
            }

            debug("Translation creation error", error);
            res.code(500);
            return {
                message: error.message
            };
        }
    });

    instance.delete("/:identifier", SCHEMES.DELETE, async (req, res) => {
        
        const prefix = getPrefixHeader(req);
        const yildiz = await instance.factory.get(prefix);
        const translator = await yildiz.getTranslator();

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