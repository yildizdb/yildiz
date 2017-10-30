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
    let transValue2 = uuid.v4();
    let transIdentifier = null;
    let transIdentifier2 = null;
    let leftId = null;
    let rightId = null;

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

        assert.equal(status, 201);
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

    it("should be able to create another translation", async() => {

        const {
            status,
            body
        } = await reqProm("/translator/translate-and-store", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                value: transValue2,
                data: {
                    bla: "blup 2"
                }
            })
        });

        assert.equal(status, 201);
        assert.ok(body.identifier);
        transIdentifier2 = body.identifier;
    });

    it("should be able to create node", async() => {

        const {
            status,
            body
        } = await reqProm("/node", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                identifier: transIdentifier,
                data: {
                    bla: "blup"
                }
            })
        });

        assert.equal(status, 201);
        assert.ok(body.identifier);
        leftId = body.id;
    });

    it("should be able to get node", async() => {
        const {
            status,
            body
        } = await reqProm(`/node/${transIdentifier}`);
        assert.equal(status, 200);
        assert.ok(body.data);
    });

    it("should be able to create another node", async() => {

        const {
            status,
            body
        } = await reqProm("/node", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                identifier: transIdentifier2,
                data: {
                    bla: "blup 2"
                }
            })
        });

        assert.equal(status, 201);
        assert.ok(body.identifier);
        rightId = body.id;
    });

    it("should be able to check if edge exists", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${leftId}/${rightId}/test`);
        assert.equal(status, 404);
    });

    it("should be able to create edge", async() => {

        const {
            status,
            body
        } = await reqProm("/edge", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                leftId,
                rightId,
                relation: "test",
                attributes: {
                    taschen: "voller lila"
                },
                _extend: {}
            })
        });

        assert.equal(status, 201);
        assert.equal(body.relation, "test");
        assert.ok(body.data);
    });

    it("should be able to check if edge exists again", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${leftId}/${rightId}/test`);
        assert.equal(status, 200);
        assert.ok(body.data);
    });

    it("should be able to increase edge depth", async() => {

        const {
            status,
            body
        } = await reqProm("/edge/depth/increase", {
            method: "PUT",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                leftId,
                rightId,
                relation: "test"
            })
        });

        assert.equal(status, 200);
        assert.ok(body.success);
    });

    it("should be able to see increased edge depth", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${leftId}/${rightId}/test`);
        assert.equal(status, 200);
        assert.equal(body.depth, 2);
    });

    it("should be able to decrease edge depth", async() => {

        const {
            status,
            body
        } = await reqProm("/edge/depth/decrease", {
            method: "PUT",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                leftId,
                rightId,
                relation: "test"
            })
        });

        assert.equal(status, 200);
        assert.ok(body.success);
    });

    it("should be able to see decreased edge depth", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${leftId}/${rightId}/test`);
        assert.equal(status, 200);
        assert.equal(body.depth, 1);
    });

    it("should be able to get translated edge info for nodes", async() => {

        const {
            status,
            body
        } = await reqProm("/access/translated-edge-info", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                values: [
                    transValue,
                    transValue2
                ]
            })
        });

        assert.equal(status, 200);
        assert.ok(body.edges);
        assert.ok(body.edges.length);
        assert.ok(body.edges[0].depth);
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