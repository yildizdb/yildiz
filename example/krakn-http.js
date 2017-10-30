"use strict";

const {
    HttpServer
} = require("./../index.js");

(async() => {
    
    const server = new HttpServer(3333, {
        accessLog: true
    });

    await server.listen();
})();