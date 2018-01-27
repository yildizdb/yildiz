"use strict";

const debug = require("debug")("yildiz:metadata");

const DEFAULT_TABLES = [
    "translates",
    "edges",
    "nodes",
    "ttl",
];

class Metadata {

    constructor(yildiz){
      this.yildiz = yildiz;
      this._init();
    }

    _init() {
      this.count = {};
      DEFAULT_TABLES.forEach(n => {
        this.count[n] = 0;
      });
    }

    getCount(table) {

      if (!this.count[table]) {
        return 0;
      }

      return this.count[table];
    }

    increaseCount(table, amount = 1){

      if (typeof this.count[table] === undefined) {
        return 0;
      }

      debug("added", amount, "on", table);

      this.count[table] += amount;
      return this.count[table];
    }

    decreaseCount(table, amount = 1){

      if (typeof this.count[table] === undefined) {
        return 0;
      }

      debug("subtracted", amount, "on", table);

      this.count[table] -= amount;
      
      if (this.count[table] < 0) {
          this.count[table] = 0;
      }

      return this.count[table];
    }

    save() {
      // TODO:Save to bigtable?
    }

    close() {
      this.save();
    }
}

module.exports = Metadata;