"use strict";

const moment = require("moment");

const FORMAT = "YYYY-MM-DD HH:mm:ss";

const toMySQLTimestamp = date => {
    return moment(date).format(FORMAT);
};

module.exports = toMySQLTimestamp;