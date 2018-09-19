"use strict";

const {Server: HttpServer} = require("./build/lib/http/Server.js");

module.exports = {
    bigtable: {
        Yildiz: require("./build/lib/bigtable/Yildiz.js").Yildiz,
        YildizFactory: require("./build/lib/bigtable/YildizFactory.js").YildizFactory
    },
    HttpServer
};