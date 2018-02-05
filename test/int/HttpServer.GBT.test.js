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

const dialect = process.env["DIALECT"] || "default";
const configMain = require(`../../config/${dialect}.json`);
const configTest = require("../../config.GBT.json");

const config = process.env["LOCAL_CONFIG"] ? configTest : configMain;

const PATH_TO_CURL_DOC = "../../docs/curl.md";
let CURL_OUTPUT = `# yildiz ${pjson.version} HttpServer CURL Examples\n
[This file is auto-generated via **'yarn curl'**.]\n`;

const CURLOUT = !!process.env.CURLOUT;
if(CURLOUT){
    require("request-to-curl");
}

const port = 45456;
const server = new HttpServer(port, Object.assign(
    config, 
    {
        accessLog: false,
        enableRaw: true, //be aware that this might be a security issue
        ttl: {
            active: true,
            lifeTimeInSec: 3,
            jobIntervalInSec: 3,
    },
    procedures: {
        depthTransfer: {
            minAge: 1,
            minAgeType: "SECOND"
        }
    },
    walker: {
        disable: false,
        interval: 500
    }
}));

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

    let idTestNode1 = null;
    let idTestNode2 = null;
    let idTestIdentifier1 = null;
    let idTestIdentifier2 = null;

    let upsertNode1 = null;
    let upsertNode2 = null;
    let upsertNode3 = null;
    let upsertNode4 = null;

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
        } = await reqProm("/translator/123", {}, null, null, null);
        assert.equal(status, 400);
    });

    it("should be able to make a HEAD request", async() => {
        const {
            status
        } = await reqProm("/", {
            method: "HEAD"
        }, null, null, null);
        assert.equal(status, 200);
    });

    it("should be able to make a OPTIONS request", async() => {
        const {
            status
        } = await reqProm("/", {
            method: "OPTIONS"
        }, null, null, null);
        assert.equal(status, 204);
    });

    it("should be able to make a 404 request", async() => {
        const {
            status
        } = await reqProm("/brr/brr", undefined, true);
        assert.equal(status, 404);
    });

    it("should be able to do translation", async() => {

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

    it("should be able to do another translation", async() => {

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
                relation: `another${relationVal}`,
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
    });

    it("should be able to create relation in singularity with depthBeforeCreation ", async () => {

        const {
            status,
            body
        } = await reqProm("/access/upsert-singular-relation-no-transaction", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                leftNodeIdentifierVal: "bla-bla-bla",
                rightNodeIdentifierVal: "blup-blup-blup", 
                leftNodeData: {foo : "bar"},
                rightNodeData: {tes : "ting"},
                ttld: true,
                relation: "1",
                edgeData: {},
                depthBeforeCreation: true
            })
        }, true, "Complex 2 node, 1 edge relation creation (also creates translations) in single request.");

        if(status !== 200){
            console.log(body);
        }

        assert.equal(status, 200);
        assert.ok(body.leftNodeId);
        assert.ok(body.rightNodeId);
        assert.ok(body.edgeId);
    });

    it("should be able to create another relation in singularity with depthBeforeCreation", async () => {

        const {
            status,
            body
        } = await reqProm("/access/upsert-singular-relation", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                leftNodeIdentifierVal: "bla-bla-bla",
                rightNodeIdentifierVal: "blup-blup-blup", 
                leftNodeData: {foo : "bar"},
                rightNodeData: {tes : "ting"},
                ttld: true,
                relation: "1",
                edgeData: {},
                depthBeforeCreation: true
            })
        }, true, "Complex 2 node, 1 edge relation creation (also creates translations) in single request.");

        if(status !== 200){
            console.log(body);
        }

        assert.equal(status, 200);
        assert.ok(body.leftNodeId);
        assert.ok(body.rightNodeId);
        assert.ok(body.edgeId);

        upsertNode1 = body.leftNodeId;
        upsertNode2 = body.rightNodeId;
    });

    it("should be able to check depths in created edges", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${upsertNode1}/${upsertNode2}/test`, undefined, true, "Get existing edge.");
        
        assert.equal(status, 200);

        const edges = body.id.split(",");

        assert.ok(body.data);
        assert.equal(body.data[edges[0]], 2);
        assert.equal(body.data[edges[1]], 2);
    });

    it("should be able to get the correct data in left node from upsert", async() => {

        const {
            status,
            body
        } = await reqProm(`/node/${upsertNode1}`, undefined, true, "Get information about node.");
        
        assert.equal(status, 200);
        assert.ok(body.data);
        assert.equal(body.data.foo, "bar");
        assert.ok(body.ttld);
    });

    it("should be able to get the correct data in right node from upsert", async() => {
        
        const {
            status,
            body
        } = await reqProm(`/node/${upsertNode2}`, undefined, true, "Get information about node.");
    
        assert.equal(status, 200);
        assert.ok(body.data);
        assert.equal(body.data.tes, "ting");
        assert.ok(body.ttld);
    });

    it("should be able to create another relation in singularity WITHOUT depthBeforeCreation", async () => {

        const {
            status,
            body
        } = await reqProm("/access/upsert-singular-relation", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                leftNodeIdentifierVal: "sna-sna",
                rightNodeIdentifierVal: "foo-foo", 
                leftNodeData: {foo : "bar"},
                rightNodeData: {tes : "ting"},
                ttld: true,
                relation: "test",
                edgeData: {bibim: "bap"},
                depthBeforeCreation: false
            })
        }, true, "Complex 2 node, 1 edge relation creation (also creates translations) in single request.");

        if(status !== 200){
            console.log(body);
        }

        assert.equal(status, 200);
        assert.ok(body.leftNodeId);
        assert.ok(body.rightNodeId);
        assert.ok(body.edgeId);

        upsertNode3 = body.leftNodeId;
        upsertNode4 = body.rightNodeId;
    });

    it("should be able to check data in created edges", async() => {
        const {
            status,
            body
        } = await reqProm(`/edge/${upsertNode3}/${upsertNode4}/test`, undefined, true, "Get existing edge.");
        
        assert.equal(status, 200);

        const edges = body.id.split(",");

        assert.ok(body.data);

        const data1 = JSON.parse(body.data[edges[0]]);
        const data2 = JSON.parse(body.data[edges[1]]);

        assert.equal(data1.bibim, "bap");
        assert.equal(data2.bibim, "bap");

    });

    it("should be able to count nodes", async() => {
        const {
            status,
            body
        } = await reqProm("/node/counts", {
            method: "GET"
        }, true, "Get counts for nodes.");

        assert.equal(status, 200);
        assert.equal(body.counts, 6);
    });

    it("should be able to count edges", async() => {
        const {
            status,
            body
        } = await reqProm("/edge/counts", {
            method: "GET"
        }, true, "Get counts for edges.");

        assert.equal(status, 200);
        assert.equal(body.counts, 5);
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

    it("should be able to count all edges and nodes", async() => {
        const {
            status,
            body
        } = await reqProm("/admin/metadata/counts", {
            method: "GET"
        }, true, "Get counts for all.");

        assert.equal(status, 200);
        assert.equal(body.nodes, 4);
        assert.equal(body.edges, 4);

    });

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
        }).then(({body}) => {
            nodeId2 = body.id;
        });

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

    it("should count zero for nodes after job running", async() => {
        const {
            status,
            body
        } = await reqProm("/node/counts", {
            method: "GET"
        }, true, "Get a count for nodes.");

        assert.equal(status, 200);
        assert.equal(body.counts, 0);
    });

    it("should be able to see stats", async() => {
        const {
            status,
            body
        } = await reqProm("/admin/stats", undefined, true, "Statistics for all running prefix yildiz instances in factory.");
        assert.equal(status, 200);
        assert.ok(body.up);
        // assert.ok(body.factory.http_test);
        // assert.equal(typeof body.factory.http_test, "object");
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

    it("should reset tables based on prefix in bigtable", async() => {
        const {
            status,
            body
        } = await reqProm(
            "/admin/reset-tables", 
            { method: "POST" }, 
            true, 
            "Reset tables."
        );

        assert.equal(status, 200);
    });

    if(CURLOUT){
        it("should be able to write curl output to file", async() => {
            await writeCurlToFile(CURL_OUTPUT);
            console.log("Curl-Docs updated.");
        });
    }
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