"use strict";

const {
    HttpServer
} = require("./../index.js");

const config = require("../config.GBT.json");

const server = new HttpServer(3333, config);
server.listen();