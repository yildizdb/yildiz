"use strict";

const {Server: HttpServer} = require("./lib/http/Server.js");

module.exports = {
    rdbms: {
        Yildiz: require("./lib/rdbms/Yildiz.js").Yildiz,
        YildizFactory: require("./lib/rdbms/YildizFactory.js").YildizFactory
    },
    bigtable: {
        Yildiz: require("./lib/bigtable/Yildiz.js").Yildiz,
        YildizFactory: require("./lib/bigtable/YildizFactory.js").YildizFactory
    },
    HttpServer
};