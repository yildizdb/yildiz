"use strict";

const {
    HttpServer
} = require("./../index.js");

const options = process.env["DIALECT"] === "postgres" ? require("../config/psql.json") : require("../config/default.json");

const server = new HttpServer(3333, options);
server.listen();