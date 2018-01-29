"use strict";

const {
    HttpServer
} = require("./../index.js");

const dialect = process.env["DIALECT"] || "default";
const options = require(`../config/${dialect}.json`);

const server = new HttpServer(3333, options);
server.listen();