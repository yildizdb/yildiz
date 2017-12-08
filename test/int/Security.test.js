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

   it("should be able to run successfull authcheck [prefix to token]", async() => {

        const token = "bla-blup-bli";

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": [token]
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            token,
            prefix: "authtest"
        }));

        await server.listen();
        assert.equal(200, await yildiz.checkAuth());
        server.close();
        return new Promise(resolve => setTimeout(resolve, 500));
   });

   it("should be able to run successfull authcheck [prefix to wildcard]", async() => {
    
        const token = "bla-blup-bli";

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": "*"
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            prefix: "authtest"
        }));

        await server.listen();
        assert.equal(200, await yildiz.checkAuth());
        server.close();
        return new Promise(resolve => setTimeout(resolve, 500));
    });

    it("should be able to run successfull authcheck [wildcard to wildcard]", async() => {
        
        const token = "bla-blup-bli";

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: "*"
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            prefix: "authtest"
        }));

        await server.listen();
        assert.equal(200, await yildiz.checkAuth());
        server.close();
        return new Promise(resolve => setTimeout(resolve, 500));
    });

    it("should be able to run successfull authcheck [mixed to wildcard]", async() => {
        
        const token = "bla-blup-bli";

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": "*",
                "*": [token]
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            prefix: "authtest"
        }));

        await server.listen();
        assert.equal(200, await yildiz.checkAuth());
        server.close();
        return new Promise(resolve => setTimeout(resolve, 500));
    });

    it("should be able to run successfull authcheck [mixed to wildcard 2]", async() => {
        
        const token = "bla-blup-bli";

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": [token],
                "*": ["bla"]
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            token: "bla",
            prefix: "authtest"
        }));

        await server.listen();
        assert.equal(200, await yildiz.checkAuth());
        server.close();
        return new Promise(resolve => setTimeout(resolve, 500));
    });

    it("should be able to run successfull authcheck [neither wildcard]", async() => {
        
        const token = "bla-blup-bli";

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": [token],
                "*": ["blax"]
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            prefix: "authtest"
        }));

        await server.listen();

        return await yildiz.checkAuth()
        .then(_ => {throw new Error("shouldnt reach");})
        .catch(error => {
            assert.equal(error.message, "Response status code: 401 does match expected status code: 200.");
            server.close();
            return new Promise(resolve => setTimeout(resolve, 500));
        });
    });

   it("should not be able to run bad authcheck [unconfigured prefix]", async() => {
    
        const token = "bla-blup-bli";

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": [token]
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            token,
            prefix: "authtestunconfigured"
        }));

        await server.listen();

        return await yildiz.checkAuth()
        .then(_ => {throw new Error("shouldnt reach");})
        .catch(error => {
            assert.equal(error.message, "Response status code: 403 does match expected status code: 200.");
            server.close();
            return new Promise(resolve => setTimeout(resolve, 500));
        });
    });

    it("should not be able to run bad authcheck [bad token]", async() => {

        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": ["bla-blup-bli"]
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            token: "othertoken",
            prefix: "authtest"
        }));

        await server.listen();

        return await yildiz.checkAuth()
        .then(_ => {throw new Error("shouldnt reach");})
        .catch(error => {
            assert.equal(error.message, "Response status code: 401 does match expected status code: 200.");
            server.close();
            return new Promise(resolve => setTimeout(resolve, 500));
        });
    });

    it("should not be able to run bad authcheck [no token]", async() => {
        
        const server = new HttpServer(port, Object.assign(serverOptions, {
            access: {
                "authtest": ["bla-blup-bli"]
            }
        }));

        const yildiz = new YildizClient(Object.assign(clientOptions, {
            prefix: "authtest"
        }));

        await server.listen();

        return await yildiz.checkAuth()
        .then(_ => {throw new Error("shouldnt reach");})
        .catch(error => {
            assert.equal(error.message, "Response status code: 401 does match expected status code: 200.");
            server.close();
            return new Promise(resolve => setTimeout(resolve, 500));
        });
    });
});