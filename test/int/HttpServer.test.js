"use strict";

const assert = require("assert");
const request = require("request");
const uuid = require("uuid");

const {
    HttpServer
} = require("./../../index.js");
const pjson = require("./../../package.json");

const port = 45456;
const server = new HttpServer(port);
const prefix = "http_test";

describe("HttpServer INT", () => {

    let transValue = uuid.v4();
    let transIdentifier = null;

    before(async() => {
        await server.listen();
    });

    after(async() => {
        await server.close();
    });

    it("should be able to see root version", async() => {
        const {
            status,
            body
        } = await reqProm();
        assert.equal(status, 200);
        assert.equal(body.version, pjson.version);
    });

    it("should be able to make health check", async() => {
        const {
            status,
            body
        } = await reqProm("/admin/health");
        assert.equal(status, 200);
        assert.equal(body.status, "UP");
    });

    it("should be able to make health check 2", async() => {
        const {
            status
        } = await reqProm("/admin/healthcheck");
        assert.equal(status, 200);
    });

    it("should be able to create translation", async() => {

        const {
            status,
            body
        } = await reqProm("/translator/translate-and-store", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                value: transValue,
                data: {
                    bla: "blup"
                }
            })
        });

        assert.equal(status, 200);
        assert.ok(body.identifier);
        transIdentifier = body.identifier;
    });

    it("should be able to get translation", async() => {
        const {
            status,
            body
        } = await reqProm(`/translator/${transIdentifier}`);
        assert.equal(status, 200);
        assert.equal(body.value, transValue);
    });
});

const reqProm = (path = "/", options = {}) => {

    options.url = `http://localhost:${port}${path}`;
    if (!options.headers) {
        options.headers = {};
    }
    options.headers["x-krakn-prefix"] = prefix;

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {

            if (error) {
                return reject(error);
            }

            try {
                body = JSON.parse(body);
            } catch (error) {
                //empty
            }

            resolve({
                status: response.statusCode,
                headers: response.headers,
                body
            });
        });
    });
};