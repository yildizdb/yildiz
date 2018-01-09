"use strict";

const uuid = require("uuid");

const strToInt = require("./strToInt.js");

const generateId = id => {

    if(typeof id !== "undefined"){
        return id;
    }

    return strToInt(uuid.v4());
};

module.exports = generateId;