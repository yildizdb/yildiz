"use strict";

const debug = require("debug")("krakn:http:helper");

const get200ObjectSchema = properties => {
    return {
        schema: {
            response: get2xxResponse(properties)
        }
    };
};

const get2xxResponse = properties => {
    return {
        "2xx": {
            type: "object",
            properties
        }
    }
};

const getPrefixHeader = (req, _default = "default") => {

    if(!req.headers || !req.headers["x-krakn-prefix"]){
        debug("krakn-prefix header is missing.");
        if(_default){
            return _default;
        } else {
            throw new Error("krakn-prefix header is missing and no default is set.");
        }
    }

    return req.headers["x-krakn-prefix"];
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