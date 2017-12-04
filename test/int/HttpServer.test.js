"use strict";

const assert = require("assert");
const request = require("request");
const uuid = require("uuid");
const fs = require("fs");
const path = require("path");

const {
    HttpServer
} = require("./../../index.js");
const pjson = require("./../../package.json");

const PATH_TO_CURL_DOC = "../../docs/curl.md";
let CURL_OUTPUT = `# yildiz ${pjson.version} HttpServer CURL Examples\n
[This file is auto-generated via **'yarn curl'**.]\n`;

const CURLOUT = !!process.env.CURLOUT;
if(CURLOUT){
    require("request-to-curl");
}

const port = 45456;
const server = new HttpServer(port, {
    accessLog: false,
    enableRaw: true, //be aware that this might be a security issue
    ttl: {
        active: true,
        lifeTimeInSec: 2,
        jobIntervalInSec: 1
    }
});

const prefix = "http_test";

describe("HttpServer INT", () => {

    let transValue = uuid.v4();
    let transValue2 = uuid.v4();
    let transIdentifier = null;
    let transIdentifier2 = null;
    let leftId = null;
    let rightId = null;

    const relationVal = "test";
    const relationHash = 3127628307;

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
        } = await reqProm(undefined, undefined, true, "Index request.");
        assert.equal(status, 200);
        assert.equal(body.version, pjson.version);
    });

    it("should be able to make health check", async() => {
        const {
            status,
            body
        } = await reqProm("/admin/health", undefined, true, "Healthcheck with status information.");
        assert.equal(status, 200);
        assert.equal(body.status, "UP");
    });

    it("should be able to make health check 2", async() => {
        const {
            status
        } = await reqProm("/admin/healthcheck", undefined, true, "Quick healthcheck.");
        assert.equal(status, 200);
    });

    it("should be able to get rejected for missing prefix", async() => {
        const {
            status
        } = await reqProm("/translator/123", {}, null, null, null);
        assert.equal(status, 400);
    });

    it("should be able to get rejected for missing prefix", async() => {
        const {
            status
        } = await reqProm("/translator/123", {}, null, null, "!-Ä:");
        assert.equal(status, 400);
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
                    bla: "blup",
                    xd: 123,
                    derp: 1.2,
                    hihi: false
                },
                ttld: true
            })
        }, true, "Store translation information. (value is automatically translated into hash.)");

        assert.equal(status, 201);
        assert.ok(body.identifier);
        assert.ok(body.ttld);
        transIdentifier = body.identifier;
    });

    it("should be able to get translation", async() => {
        const {
            status,
            body
        } = await reqProm(`/translator/${transIdentifier}`, undefined, true, "Get translation information.");
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
        assert.ok(!body.ttld);
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
                },
                ttld: true
            })
        }, true, "Create a node.");

        assert.equal(status, 201);
        assert.ok(body.identifier);
        assert.ok(body.ttld);
        assert.ok(body.created_at);
        leftId = body.id;
    });

    it("should be able to get node", async() => {
        const {
            status,
            body
        } = await reqProm(`/node/${transIdentifier}`, undefined, true, "Get information about node.");
        assert.equal(status, 200);
        assert.ok(body.data);
        assert.ok(body.ttld);
        assert.ok(body.created_at);
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
        }, true, "Create a second node.");

        assert.equal(status, 201);
        assert.ok(body.identifier);
        assert.ok(!body.ttld);
        rightId = body.id;
    });

    it("should be able to check if edge exists", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${leftId}/${rightId}/test`, undefined, true, "Check whether an edge exists.");
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
                relation: relationVal,
                attributes: {
                    taschen: "voller lila"
                },
                _extend: {},
                ttld: true
            })
        }, true, "Create an edge between two nodes.");

        assert.equal(status, 201);
        assert.ok(body.success);
    });

    it("should be able to check if edge exists again", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${leftId}/${rightId}/test`, undefined, true, "Get existing edge.");
        assert.equal(status, 200);
        assert.ok(body.data);
        assert.ok(body.ttld);
        assert.ok(body.created_at);
    });

    it("should be able to create another similar edge for the same id pair", async() => {
        
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
                relation: relationVal,
                attributes: {
                    taschen: "voller lila zum quadrat"
                },
                _extend: {}
            })
        }, true, "Create another edge between two nodes.");
        assert.equal(status, 201);
        assert.ok(body.success);
    });

    it("should be able to create a swapped edge for the same id pair", async() => {
        
        const {
            status,
            body
        } = await reqProm("/edge", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                leftId: rightId, //swap
                rightId: leftId, //swap
                relation: relationVal,
                attributes: {
                    taschen: "voller lila zum quadrat swapped"
                },
                _extend: {}
            })
        }, true, "Create an edge between two nodes (swapped ids).");
        assert.equal(status, 201);
        assert.ok(body.success);
    });

    it("should be able to see a two lefted edges", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/left/${leftId}/${relationVal}`, undefined, true, "Get all edges with left node id and relation.");
        assert.equal(status, 200);
        assert.ok(body.edges);
        assert.equal(body.edges.length, 2);
    });

    it("should be able to see a single righted edges", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/right/${leftId}/${relationVal}`, undefined, true, "Get all edges with right node id and relation");
        assert.equal(status, 200);
        assert.ok(body.edges);
        assert.equal(body.edges.length, 1);
    });

    it("should be able to see a all edges", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/both/${leftId}/${relationVal}`, undefined, true, "Get all edges with left or right node id and relation");
        assert.equal(status, 200);
        assert.ok(body.edges);
        assert.equal(body.edges.length, 3);
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
                relation: relationHash
            })
        }, true, "Increase depth of an edge.");

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
        assert.ok(body.ttld);
        assert.ok(body.created_at);
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
        }, true, "Decrease depth of an edge.");
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
        }, true, "Complex merged information about edges for translated nodes.");

        assert.equal(status, 200);
        assert.ok(body.edges);
        assert.ok(body.edges.length);
        assert.ok(body.edges[0].depth);
    });

    it("should be able to delete edges", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${leftId}/${rightId}/test`, {
            method: "DELETE"
        }, true, "Deleting an edge.");
        assert.equal(status, 200);
        assert.ok(body.success);
    });

    it("should be able to delete additional swapped edge via raw command", async() => {
        const {
            status,
            body
        } = await reqProm(`/raw/spread`, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                query: "DELETE FROM http_test_edges WHERE 1 = 1"
            })
        }, true, "Executing raw spread (queries with metadata result).");
        assert.equal(status, 200);
        assert.ok(body.metadata);
        assert.ok(body.metadata.affectedRows);
    });

    it("should be able to query edge count via raw command", async() => {
        const {
            status,
            body
        } = await reqProm(`/raw/query`, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                query: "SELECT COUNT(*) AS count FROM http_test_edges"
            })
        }, true, "Executing raw spread (queries with result set).");
        assert.equal(status, 200);
        assert.ok(body.results);
        assert.ok(!body.results[0].count);
    });

    it("should not be able to see edge", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${leftId}/${rightId}/test`);
        assert.equal(status, 404);
    });

    it("should be able to delete node", async() => {
        const {
            status,
            body
        } = await reqProm(`/node/${transIdentifier}`, {
            method: "DELETE"
        }, true, "Deleting a node.");
        assert.equal(status, 200);
        assert.ok(body.success);
    });

    it("should be able to delete other node", async() => {
        const {
            status,
            body
        } = await reqProm(`/node/${transIdentifier2}`, {
            method: "DELETE"
        });
        assert.equal(status, 200);
        assert.ok(body.success);
    });

    it("should be able to delete translation", async() => {
        const {
            status,
            body
        } = await reqProm(`/translator/${transIdentifier}`, {
            method: "DELETE"
        }, true, "Deleting a translation.");
        assert.equal(status, 200);
        assert.ok(body.success);
    });

    it("should be able to delete other translation", async() => {
        const {
            status,
            body
        } = await reqProm(`/translator/${transIdentifier2}`, {
            method: "DELETE"
        });
        assert.equal(status, 200);
        assert.ok(body.success);
    });

    it("should be able to see stats", async() => {
        const {
            status,
            body
        } = await reqProm("/admin/stats", undefined, true, "Statistics for all running prefix yildiz instances in factory.");
        assert.equal(status, 200);
        assert.ok(body.http_test);
        assert.equal(typeof body.http_test, "object");
        assert.ok(body.http_test.internCalls.queries);
    });

    it("should be able to see metrics", async() => {
        const {
            status,
            headers,
            body
        } = await reqProm("/admin/metrics", undefined, true, "Get Prometheus Metrics.");
        assert.equal(status, 200);
        assert.equal(headers["content-type"], "text/plain; version=0.0.4; charset=utf-8");
        assert.ok(body);
    });

    if(CURLOUT){
        it("should be able to write curl output to file", async() => {
            await writeCurlToFile(CURL_OUTPUT);
            console.log("Curl-Docs updated.");
        });
    }

    it("should be able to create a few ttld resources", async() => {

        let nodeId1 = null;
        let nodeId2 = null;

        await reqProm("/translator/translate-and-store", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                value: "who will watch over you",
                data: {},
                ttld: true
            })
        });

        await reqProm("/node", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                identifier: "now1",
                data: {},
                ttld: true
            })
        }).then(({body}) => nodeId1 = body.id);

        await reqProm("/node", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                identifier: "now2",
                data: {},
                ttld: true
            })
        }).then(({body}) => nodeId2 = body.id);

        const {
            status,
            body
        } = await reqProm("/edge", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                leftId: nodeId1, 
                rightId: nodeId2,
                relation: "blllaaaaa",
                attributes: {},
                _extend: {},
                ttld: true
            })
        });
        assert.equal(status, 201);
        assert.ok(body.success);
    });

    it("should be able to await next ttl job execution", function(done){
        this.timeout(2505);
        setTimeout(done, 2500);
    });

    it("should be not see any of the created ttl flagged resources", async() => {

        const transQuery = "SELECT COUNT(*) as count FROM http_test_translates";
        const nodesQuery = "SELECT COUNT(*) as count FROM http_test_nodes";
        const edgesQuery = "SELECT COUNT(*) as count FROM http_test_edges";

        const {
            status,
            body
        } = await reqProm(`/raw/query`, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                query: `SELECT (${transQuery}) as tcount, (${nodesQuery}) as ncount, (${edgesQuery}) as ecount`
            })
        });
        assert.equal(status, 200);
        assert.ok(body.results);
        assert.ok(body.results[0]);
        assert.equal(body.results[0].tcount, 0);
        assert.equal(body.results[0].ncount, 0);
        assert.equal(body.results[0].ecount, 0);
    });
});

const reqProm = (path = "/", options = {}, curl = false, description = "Not described", _prefix = undefined) => {

    options.url = `http://localhost:${port}${path}`;
    if (!options.headers) {
        options.headers = {};
    }
    
    options.headers["x-yildiz-prefix"] = _prefix !== undefined ? _prefix : prefix;
    if(!options.headers["x-yildiz-prefix"]){
        delete options.headers["x-yildiz-prefix"];
    }

    return new Promise((resolve, reject) => {
        request(options, (error, response, body) => {

            if (error) {
                return reject(error);
            }

            if(CURLOUT && curl){
                formatCurl(response.request.req.toCurl(), description, body, response.statusCode);
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

const formatCurl = (curl, description, body, status) => {
    CURL_OUTPUT += `\n* ->${description}<-\n\n\`\`\`shell
    # Request:
    ${curl}\n
    # ${status}-Response:
    ${body ? "# " : "#"}${body}\n\`\`\`\n`;
};

const writeCurlToFile = (curlOutput) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, PATH_TO_CURL_DOC);
        console.log("Storing:", filePath, curlOutput.length);
        fs.writeFile(filePath, curlOutput, "utf8", error => {

            if(error){
                return reject(error);
            }

            resolve();
        });
    });
};