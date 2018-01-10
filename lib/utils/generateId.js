"use strict";

const uuid = require("uuid/v4");
const murmur = require("murmurhash").v3;

const generateId = id => {

    if(typeof id !== "undefined"){
        return id;
    }

    return murmur(uuid());
};

module.exports = generateId;