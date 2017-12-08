"use strict";

const assert = require("assert");
const {YildizClient} = require("yildiz-js");

const {
    HttpServer
} = require("./../../index.js");

const port = 45454;

const serverOptions = {
    accessLog: false,
    enableRaw: true,
    ttl: {
        active: true,
        lifeTimeInSec: 2,
        jobIntervalInSec: 1
    }
};

const clientOptions = {
    proto: "http",
    host: "localhost",
    port: 45454
};

describe("Security INT", () => {

   it("should be able to run successfull authcheck", async() => {

        const token = "bla-blup-bli";

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": token
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            token,
            prefix: "authtest",
        }));

        await server.listen();
        assert.equal(200, await yildiz.checkAuth());
        server.close();
        return new Promise(resolve => setTimeout(resolve, 500));
   });
});