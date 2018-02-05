"use strict";

const {
    HttpServer
} = require("./../index.js");

const dialect = process.env["DIALECT"] || "default";
const config = process.env["LOCAL_CONFIG"] ? 
    require("../config.GBT.json")
    : 
    require(`../config/${dialect}.json`);

const server = new HttpServer(3333, config);
server.listen();