"use strict";

const debug = require("debug")("yildiz:http:helper");

const get200ObjectSchema = properties => {
    return {
        schema: {
            response: get2xxResponse(properties)
        }
    };
};

const get2xxResponse = (properties, additionalProperties = false) => {
    return {
        "2xx": {
            type: "object",
            properties,
            additionalProperties
        }
    }
};

const getPrefixHeader = (req, _default = "default") => {

    if(!req.headers || !req.headers["x-yildiz-prefix"]){
        debug("yildiz-prefix header is missing.");
        if(_default){
            return _default;
        } else {
            throw new Error("yildiz-prefix header is missing and no default is set.");
        }
    }

    return req.headers["x-yildiz-prefix"];
};

const getErrorObject = (message, code) => {
    return {
        error: message,
        code
    };
};

module.exports = {
    get200ObjectSchema,
    getPrefixHeader,
    getErrorObject,
    get2xxResponse
};