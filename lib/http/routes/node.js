"use strict";

const {get200ObjectSchema} = require("./../helper.js");
const pjson = require("./../../../package.json");

const SCHEMES = {
    ROOT: get200ObjectSchema({
        version: { type: "string" }
    })
};

module.exports = (instance, options, next) => {

    instance.get("/", SCHEMES.ROOT, (req, res) => {
        res.send({
            version: pjson.version
        });
    });

    next();
};

//nodeHandler.getNodeByIdentifier
//nodeHandler.createNode
//nodeHandler.edgeExistsId
//nodeHandler.createEdge
//nodeHandler.increaseEdgeDepthById