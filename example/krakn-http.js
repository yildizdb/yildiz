"use strict";

const {
    HttpServer
} = require("./../index.js");

const options = require("./../config/default.json");

const server = new HttpServer(3333, options);
server.listen();