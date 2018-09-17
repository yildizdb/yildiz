import { FastifyInstance, RegisterOptions } from "fastify";
import { Server, IncomingMessage, ServerResponse } from "http";
import { NextFunction } from "express";

import { getPrefixHeader } from "./../helper";
import { pathSchema } from "./../schemas";

const SCHEMES = pathSchema;

const pathRoute = (
    instance: FastifyInstance,
    options: RegisterOptions<Server, IncomingMessage, ServerResponse>,
    next: NextFunction) => {

    instance.post("/shortest-path", SCHEMES.SHORTEST, async (req, res) => {

        const prefix = getPrefixHeader(req);

        return {
            paths: [],
        };
    });

    next();
};

export default pathRoute;
