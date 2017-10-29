"use strict";

const Promise = require("bluebird");
const fastify = require("fastify");
const debug = require("debug")("krakn:http:server");
const cors = require("cors");
const log4bro = require("log4bro");

const pjson = require("./../../package.json");
const SERVER_NAME = `krakn-http:${pjson.version}`;

const {
    KraknFactory
} = require("./../KraknFactory.js");

const {
    admin,
    root
} = require("./routes");

class Server {

    constructor(port = 3058, options = {}) {

        this.port = port;

        let {
            accessLog
        } = options;

        this.accessLog = typeof accessLog === "boolean" ? accessLog : true;

        this.app = fastify();
        this.factory = new KraknFactory();
    }

    async init() {

        this.app.decorate("factory", this.factory);

        this.app.use((req, res, next) => {
            res.setHeader("powered-by", SERVER_NAME);
            next();
        });

        if(this.accessLog){

            const logger = new log4bro({
                productionMode: true,
                silence: false,
                dockerMode: true,
                varKey: "L4B",
                serviceName: "krakn-http"
            });

            logger.applyMiddlewareAccessLog(this.app);
        }
        
        this.app.use(cors());

        this.app.register(root, {
            prefix: "/"
        });
        this.app.register(admin, {
            prefix: "/admin"
        });
    }

    listen() {
        return new Promise((resolve, reject) => {
            this.app.listen(this.port, error => {

                if (error) {
                    return reject(error);
                }

                debug("server listening on port", this.port);
                resolve(this.port);
            });
        });
    }
}

module.exports = {
    Server
};