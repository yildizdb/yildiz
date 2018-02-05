"use strict";

const {
    HttpServer
} = require("./../index.js");

const dialect = process.env["DIALECT"] || "default";

const configMain = require(`../config/${dialect}.json`);
const configTest = require("../config.GBT.json");

const config = process.env["LOCAL_CONFIG"] ? configTest : configMain;

const server = new HttpServer(3333, config);
server.listen();