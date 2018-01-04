"use strict";

const Promise = require("bluebird");
const fastify = require("fastify");
const debug = require("debug")("yildiz:http:server");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const pjson = require("./../../package.json");
const SERVER_NAME = `yildiz-http:${pjson.version}`;

const {
    YildizFactory
} = require("./../YildizFactory.js");
const Translator = require("./../graph/Translator.js");
const Metrics = require("./Metrics.js");

const {
    admin,
    root,
    translator,
    node,
    edge,
    access,
    raw,
    path: pathRouter
} = require("./routes");

const SWAGGER_FILE = "../../docs/swagger.json";
let CREATE_SWAGGER = false;
if(process.env.CREATE_SWAGGER){
    CREATE_SWAGGER = true;
}

const prefixRegex = /^\w+$/;

class Server {

    constructor(port = 3058, options = {}) {

        this.port = port;

        let {
            accessLog,
            enableRaw
        } = options;

        this.accessLog = typeof accessLog === "boolean" ? accessLog : false;
        this.enableRaw = typeof enableRaw === "boolean" ? enableRaw : false;

        this.app = fastify();
        this.factory = new YildizFactory(options);
        this.translator = new Translator(null);
        this.metrics = new Metrics(this);
        this.stats = {
            http: {},
            avgResponseTime: 0
        };

        this._init();
    }

    _init() {

        debug("initialising http server routes..");

        this.app.decorate("factory", this.factory);
        this.app.decorate("translator", this.translator);
        this.app.decorate("metrics", this.metrics);

        this.app.decorate("getStats", () => {
            return this.getStats();
        });

        this.app.decorate("incStat", key => {
            return this.incStat(key);
        });

        this.app.use((req, res, next) => {
            this.incStat("request");
            res.setHeader("powered-by", SERVER_NAME);
            next();
        });

        const registerErrorHandler = error => {
            if(error){
                throw error;
            }
        }
        
        this.app.use(cors());

        if(CREATE_SWAGGER){
            debug("creating swagger file.");
            this.app.register(require("fastify-swagger"), {
                swagger: {
                    info: {
                        title: "yildiz HTTP interface",
                        description: "Graph Database on top of MySQL",
                        version: pjson.version
                    },
                    host: "localhost",
                    schemes: ["http"],
                    consumes: ["application/json"],
                    produces: ["application/json"]
                }
            });
        }

        this.app.register(root, {
            prefix: "/"
        }, registerErrorHandler);

        this.app.register(admin, {
            prefix: "/admin"
        }, registerErrorHandler);

        //ensure prefix header safety
        this.app.use((req, res, next) => {

            if((req.url === "/" || req.url.startsWith("/admin")) && req.url !== "/admin/authcheck"){
                return next(); //skip on default paths
            }

            const prefix = req.headers["x-yildiz-prefix"];
            const authorization = req.headers["authorization"];
            
            if(!prefix){
                debug("missing prefix");
                this.incStat("missing_prefix");
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "missing 'x-yildiz-prefix' header"
                }));
            }

            if(!prefixRegex.test(prefix)){
                debug("bad prefix format");
                this.incStat("bad_prefix");
                res.statusCode = 400;
                return res.end(JSON.stringify({
                    error: "Prefix header is not accepted, check on this regex: ^\w+$"
                }));
            }

            const authcode = this.factory.isPrefixWithTokenAllowed(prefix, authorization);
            //debug("access:", authcode, prefix, !!authorization);

            switch(authcode){

                case -1:
                    this.incStat("auth_failed_prefix");
                    res.statusCode = 403;
                    return res.end(JSON.stringify({
                        error: "Using this prefix is not allowed."
                    }));

                case 0:
                    this.incStat("auth_failed_token");
                    res.statusCode = 401;
                    return res.end(JSON.stringify({
                        error: "Your token has no access to this prefix."
                    }));

                case 1:
                    this.incStat("auth_good");
                break;

                default:
                    debug("Unhandled authcode result", authcode);
                    res.statusCode = 501;
                    return res.end(JSON.stringify({
                        error: "Unknown Internal Error during access identification."
                    }));
            }

            next();
        });

        this.app.register(translator, {
            prefix: "/translator"
        }, registerErrorHandler);

        this.app.register(pathRouter, {
            prefix: "/path"
        }, registerErrorHandler);

        this.app.register(node, {
            prefix: "/node"
        }, registerErrorHandler);

        this.app.register(edge, {
            prefix: "/edge"
        }, registerErrorHandler);

        this.app.register(access, {
            prefix: "/access"
        }, registerErrorHandler);

        if(this.enableRaw){
            debug("raw access enabled!");
            this.app.register(raw, {
                prefix: "/raw"
            }, registerErrorHandler);
        } else {
            debug("raw access disabled.");
        }

        this.app.addHook("onRequest", (req, res, next) => {
            //measure response time
            res._inc = Date.now();
            res._url = req.url;
            next();
        });

        this.app.addHook("onResponse", (res, next) => {

            let diff = -1;
            if(res._inc){
                diff = Date.now() - res._inc;
            }

            if(this.accessLog){ //TODO request method?
                debug(`Access-Log ${res.statusCode} ${res._url} ${diff} ms.`);                
            }
            
            if(res.statusCode !== 500 && res.statusCode !== 400){
                this.stats.avgResponseTime = (this.stats.avgResponseTime + diff) / 2;
            }

            next();
        });

        //custom error handler
        this.app.setErrorHandler((error, res) => {

            if(error.message === "Not found"){
                this.incStat("not_found");
                return debug(`Not found - 404 -  ${res._url}.`);
            }
            
            debug("YildizDB Error:", error.message, error.stack);
            this.incStat("error_response");
            
            res.code(500);
            res.header("content-type", "application/json");
            res.send(JSON.stringify({
                error: error.message,
                stack: error.stack
            }));
        });

        this.app.ready(error => {
            
            if(error){
                throw error;
            }

            if(typeof this.app.swagger === "function"){
                const filePath = path.join(__dirname, SWAGGER_FILE);
                fs.writeFile(filePath, JSON.stringify(this.app.swagger()), error => {

                    if(error){
                        throw error;
                    }

                    debug("wrote swagger file.");
                });
            }
        });

        debug("initialising http server routes... done.");
    }

    incStat(key){
        //int
        if(!this.stats.http[key]){
            this.stats.http[key] = 1;
        } else {
            this.stats.http[key] += 1;
        }
    }

    async getStats(){
        const stats = Object.assign({}, this.stats, {
            factory: await this.factory.getStats()
        });
        return stats;
    }

    listen() {
        return new Promise((resolve, reject) => {
            this.app.listen(this.port, error => {

                if (error) {
                    return reject(error);
                }

                debug("server listening on port", this.port);
                this.metrics.run();
                resolve(this.port);
            });
        });
    }

    close(){

       if(this.metrics){
           this.metrics.close();
       }

        return new Promise(resolve => {
            this.app.close(resolve);
        });
    }
}

module.exports = {
    Server
};