"use strict";

const {
    HttpServer
} = require("./../index.js");

const config = (process.env.LOCAL_CONFIG) ?
  require("../config.GBT.json") :
  require("../config/bigtable.json");

const server = new HttpServer(3333, config);
server.listen();