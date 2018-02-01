"use strict";

const debug = require("debug")("yildiz:metadata");

const MAIN_KEY = "metadata:1";

const DEFAULT_KEYS = [
  "nodes",  //table
  "edges", //qualifiers on nodes table
  "ttls" //table
];

class Metadata {

    constructor(yildiz){

      this.yildiz = yildiz;
      this.config = yildiz.config.metadata || {};
      this.counts = {};

      const {
        metadataTable,
        columnFamilyMetadata
      } = yildiz.models;

      this.metadataTable = metadataTable;
      this.columnFamilyMetadata = columnFamilyMetadata;

      this._init();
    }

    _init() {
      // Initialze all metadata as zero
      DEFAULT_KEYS.forEach(n => {
        this.counts[n] = 0;
      });
    }

    async getAllCount(key) {

      const row = this.metadataTable.row(MAIN_KEY);
      const counts = await row.get();

      //TODO: implement the mapping
      //TODO: also add http endpoints for this

      return {};
    }

    async getCount(key) {

      const row = this.metadataTable.row(MAIN_KEY);
      const counts = await row.get();

      //TODO: implement the mapping

      return 0;
    }

    increaseCount(key, amount = 1){

      if (typeof this.counts[key] === undefined) {
        return 0;
      }
      
      this.counts[key] += amount;
      return this.counts[key];
    }
    
    decreaseCount(key, amount = 1){

      if (typeof this.counts[key] === undefined) {
        return 0;
      }

      this.counts[key] -= amount;

      if (this.counts[key] < 0) {
        this.counts[key] = 0;
      }

      return this.counts[key];
    }

    /**
     * save syncs the in memory state of this.counts
     * to the single metadata row as qualifier increments
     * these are atomic, in memory state will be reset to 0
     */
    async save() {

        const cfname = this.columnFamilyMetadata.familyName;
        const row = this.metadataTable.row(MAIN_KEY);

        return await Promise.all(Object
          .keys(this.counts)
          .map(async key => {

            if(this.counts[key] === 0){
              return 0;
            }

            const val = this.counts[key];
            this.counts[key] = 0; //reset
            //incrementing with negative values works as decrease
            await row.increment(`${cfname}:${key}`, val);
            return val;
          }));
    }

    _runInterval(saveMetadataInSec) {

      debug(`running interval to cache metadata every ${saveMetadataInSec} seconds`);

      //TODO: would be cool to have this in a recursive timeout

      this._intv = setInterval(async () => {
          try {
            await this.save();
            debug("saving to metadata.");
          } catch(err) {
            debug("saving to metadata failed", err);
          }
      }, saveMetadataInSec * 1000);
  }

    async close() {
      
      if(this._intv){
        clearInterval(this._intv);
      }

      await this.save();
    }
}

module.exports = Metadata;