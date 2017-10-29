"use strict";

const {
    HttpServer
} = require("./../index.js");

(async() => {
    
    const server = new HttpServer(3333, {
        accessLog: false
    });

    await server.init();
    await server.listen();
})();