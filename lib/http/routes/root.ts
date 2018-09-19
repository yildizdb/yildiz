import pjson from "./../../../package.json";
import { rootSchema } from "./../schemas";
import { NextFunction } from "express";
import { FastifyInstance, FastifyRequest, FastifyReply, RegisterOptions } from "fastify";
import { IncomingMessage, ServerResponse, Server } from "http";

const SCHEMES = rootSchema;

const rootRouter = (
    instance: FastifyInstance,
    options: RegisterOptions<Server, IncomingMessage, ServerResponse>,
    next: NextFunction) => {

    instance.get("/", SCHEMES.ROOT, (req: FastifyRequest<IncomingMessage>, res: FastifyReply) => {
        res.send({
            version: pjson.version,
        });
    });

    next();
};

export default rootRouter;
