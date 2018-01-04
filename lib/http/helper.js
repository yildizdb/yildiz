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

const expectSetAsType = (data, field, type) => {
        
    if(!data || typeof body !== "object"){
        return "body must not be empty.";
    }

    if(typeof data[field] !== type){
        return `${field} must be of type ${type}.`;
    }

    if(data[field] === null){
        return `${field} must not be null.`;
    }

    return true;
};

module.exports = {
    get200ObjectSchema,
    getPrefixHeader,
    getErrorObject,
    get2xxResponse,
    expectSetAsType
};