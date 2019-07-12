import fastify from "fastify";
import cors from "cors";
import toobusy from "toobusy-js";
import { ServiceConfig } from "../interfaces/ServiceConfig";
import { IncomingMessage, ServerResponse } from "http";
import { NextFunction } from "connect";
import Debug from "debug";
import Bluebird from "bluebird";

import pjson from "./../../package.json";
const debug = Debug("yildiz:http:server");
const SERVER_NAME = `yildizdb:${pjson.version}`;

import { YildizFactory } from "./../bigtable/YildizFactory";
import { AccessHandler } from "./AccessHandler";

import {
    admin,
    root,
    translator,
    node,
    edge,
    access,
    path as pathRouter,
} from "./routes/index";

const INTERFACE = "0.0.0.0";

const prefixRegex = /^\w+$/;

export class Server {

    private port: number;
    private accessLog: boolean;
    private readinessEndpoint: boolean;
    private readinessPrefixes?: string[];
    private app: fastify.FastifyInstance;
    private accessHandler: AccessHandler;
    private factory: YildizFactory;
    private stats: {
        http: {
            [key: string]: number | string;
        };
        avgResponseTime: number;
    };

    constructor(port: number = 3058, options: ServiceConfig) {

        this.port = port;

        const {
            maxLag,
            accessLog,
            readinessEndpoint,
            readinessPrefixes,
        } = options;

        this.accessLog = typeof accessLog === "boolean" ? accessLog : false;
        this.readinessEndpoint = typeof readinessEndpoint === "boolean" ? true : false;
        this.readinessPrefixes = readinessPrefixes;
        toobusy.maxLag(maxLag || 150);

        this.app = fastify();

        this.accessHandler = new AccessHandler(options);

        if (!options.database) {
            throw new Error("database configuration is missing.");
        }

        this.factory = new YildizFactory(options);

        this.stats = {
            http: {},
            avgResponseTime: 0,
        };

        this.init();
    }

    private init() {

        debug("initialising http server routes..");

        this.app.decorate("factory", this.factory);

        this.app.decorate("getStats", () => {
            return this.getStats();
        });

        this.app.decorate("incStat", (key: string) => {
            return this.incStat(key);
        });

        this.app.use((req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
            this.incStat("request");
            res.setHeader("powered-by", SERVER_NAME);
            next();
        });

        if (!this.readinessEndpoint) {
            this.app.use((req: IncomingMessage, res: ServerResponse, next: NextFunction) => {

                if (!toobusy()) {
                    return next();
                }

                this.incStat("toobusy");
                res.statusCode = 503;
                res.end();
            });
        }

        const registerErrorHandler = (error: Error) => {
            if (error) {
                throw error;
            }
        };

        this.app.head("*", {}, (req, res) => {
            res.send();
        });

        this.app.use(cors());

        this.app.register(root, {
            prefix: "/",
        });

        this.app.register(
            admin(this.readinessEndpoint, toobusy(), this.incStat, this.readinessPrefixes), 
            { prefix: "/admin" }
        );

        // ensure prefix header safety
        this.app.use((req: IncomingMessage, res: ServerResponse, next: NextFunction) => {

            const reqUrl = req.url || "";

            if ((reqUrl === "/" || reqUrl.startsWith("/admin")) && reqUrl !== "/admin/authcheck") {
                return next(); // skip on default paths
            }

            const prefix = (req.headers["x-yildiz-prefix"] || {}).toString();

            const authorization = req.headers.authorization;

            if (!prefix) {
                debug("missing prefix");
                this.incStat("missing_prefix");
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "missing 'x-yildiz-prefix' header",
                }));
            }

            if (!prefixRegex.test(prefix)) {
                debug("bad prefix format");
                this.incStat("bad_prefix");
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Prefix header is not accepted, check on this regex: ^\w+$",
                }));
            }

            const authcode = this.accessHandler.isPrefixWithTokenAllowed(prefix, authorization);

            switch (authcode) {

                case -1:
                    this.incStat("auth_failed_prefix");
                    res.statusCode = 403;
                    return res.end(JSON.stringify({
                        error: "Using this prefix is not allowed.",
                    }));

                case 0:
                    this.incStat("auth_failed_token");
                    res.statusCode = 401;
                    return res.end(JSON.stringify({
                        error: "Your token has no access to this prefix.",
                    }));

                case 1:
                    this.incStat("auth_good");
                    break;

                default:
                    debug("Unhandled authcode result", authcode);
                    res.statusCode = 501;
                    return res.end(JSON.stringify({
                        error: "Unknown Internal Error during access identification.",
                    }));
            }

            next();
        });

        this.app.register(pathRouter, {
            prefix: "/path",
        });

        this.app.register(translator, {
            prefix: "/translator",
        });

        this.app.register(node, {
            prefix: "/node",
        });

        this.app.register(edge, {
            prefix: "/edge",
        });

        this.app.register(access, {
            prefix: "/access",
        });

        this.app.addHook("onRequest", (req, res, next) => {
            // measure response time
            res.inc = Date.now();
            res.url = req.url;
            next();
        });

        this.app.addHook("onResponse", (res, next) => {

            let diff = -1;

            if (res.inc) {
                diff = Date.now() - res.inc;
            }

            if (this.accessLog) { // TODO request method?
                debug(`Access-Log ${res.statusCode} ${res.url} ${diff} ms.`);
            }

            if (res.statusCode !== 500 && res.statusCode !== 400) {
                this.factory.metrics.set("http_avg_res_time", diff || 1);
            }

            if (res.statusCode === 500) {
                this.factory.metrics.inc("http_error_500");
            }

            if (res.statusCode === 400) {
                this.factory.metrics.inc("http_error_400");
            }

            next();
        });

        // custom error handler
        this.app.setErrorHandler((error, req, res) => {

            if (error.message === "Not Found") {
                this.incStat("not_found");
                debug(`Not found - 404 -  ${res.url}.`);

                res.code(404);
                res.header("content-type", "application/json");
                return res.send({
                    error: "Route, method, or result not found.",
                    stack: null,
                });
            }

            debug("YildizDB Error:", error.message, error.stack);
            this.incStat("error_response");

            res.code(500);
            res.header("content-type", "application/json");
            res.send({
                error: error.message,
                stack: error.stack,
            });
        });

        this.app.ready((error: Error) => {

            if (error) {
                throw error;
            }

        });

        debug("initialising http server routes... done.");
    }

    public incStat(key: string) {

        if (!this.factory.metrics) {
            return;
        }

        this.factory.metrics.inc(`http_${key}`);
    }

    public async getStats() {
        const stats = Object.assign({}, this.stats, {
            factory: await this.factory.getStats(),
        });
        return stats;
    }

    public listen() {
        return new Bluebird((resolve, reject) => {
            this.app.listen(this.port, INTERFACE, (error: Error) => {

                if (error) {
                    return reject(error);
                }

                debug("server listening on port", this.port);
                resolve(this.port);
            });
        });
    }

    public async close() {

        try {
            await this.factory.closeAll();
        } catch(error) {
            debug(error);
        }
        return new Bluebird((resolve) => {
            this.app.close(resolve);
        });
    }
}
