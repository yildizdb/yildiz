"use strict";

const {
    get200ObjectSchema,
    getPrefixHeader,
    getErrorObject
} = require("./../helper.js");
const pjson = require("./../../../package.json");

const SCHEMES = {
    TRANSLATED: get200ObjectSchema({
        identifier: {
            type: "number"
        },
        value: {
            type: "string"
        },
        data: {
            type: "object"
        }
    })
};

module.exports = (instance, options, next) => {

    instance.get("/:identifier", SCHEMES.TRANSLATED, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const translator = await krakn.getTranslator();

        return translator.getTranslation(req.params.identifier);
    });

    instance.post("/translate-and-store", SCHEMES.TRANSLATED, async (req, res) => {

        const prefix = getPrefixHeader(req);
        const krakn = await instance.factory.get(prefix);
        const translator = await krakn.getTranslator();

        const body = req.body;
        const identifier = body.identifier || translator.strToInt(body.value); //convert identifier if its not set

        if (typeof identifier !== "number") {
            res.code(400);
            return getErrorObject("If identifier is present, it must be a number.", 400);
        }

        await translator.storeTranslation(identifier, body.value, body.data || {});

        return {
            identifier,
            value: body.value,
            data: body.data
        };
    });

    //TODO update translation
    //TODO delete translation

    next();
};