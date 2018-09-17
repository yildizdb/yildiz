"use strict";

import Debug from "debug";
import { IncomingMessage } from "http";
import { FastifyRequest } from "fastify";
import { GenericSchema } from "../interfaces/Fastify";

const debug = Debug("yildiz:http:helper");

const get200ObjectSchema = (properties: GenericSchema) => {
    return {
        schema: {
            response: get2xxResponse(properties),
        },
    };
};

const get2xxResponse = (properties: GenericSchema, additionalProperties: boolean = false) => {
    return {
        "2xx": {
            type: "object",
            properties,
            additionalProperties,
        },
    };
};

const getPrefixHeader = (req: FastifyRequest<IncomingMessage>, defaultPrefix: string = "default") => {

    if (!req.headers || !req.headers["x-yildiz-prefix"]) {
        debug("yildiz-prefix header is missing.");
        if (defaultPrefix) {
            return defaultPrefix;
        } else {
            throw new Error("yildiz-prefix header is missing and no default is set.");
        }
    }

    return req.headers["x-yildiz-prefix"];
};

const getErrorObject = (message: Error["message"], code: number | string) => {
    return {
        error: message,
        code,
    };
};

const expectSetAsType = (data: GenericSchema, field: string, type: string) => {

    if (!data ) {
        return "body must not be empty.";
    }

    if (typeof data[field] !== type) {
        return `${field} must be of type ${type}.`;
    }

    if (data[field] === null) {
        return `${field} must not be null.`;
    }

    return true;
};

export {
    get200ObjectSchema,
    getPrefixHeader,
    getErrorObject,
    get2xxResponse,
    expectSetAsType,
};
