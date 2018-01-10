"use strict";

const uuid = require("uuid/v4");

const strToInt = require("./strToInt.js");

const generateId = id => {

    if(typeof id !== "undefined"){
        return id;
    }

    return strToInt(uuid());
};

module.exports = generateId;