"use strict";

const debug = require("debug")("yildiz:metadata");

const MAIN_KEY = "metadata";

const DEFAULT_SAVE_INTERVAL_SEC = 2;
const DEFAULT_COUNTS_INTERVAL_SEC = 5;
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

    async _init() {

      this.reset();

      const rowExists = await this.metadataTable.row(MAIN_KEY).exists();
      const cfName = this.columnFamilyMetadata.familyName;

      if (!rowExists || !rowExists[0]) {

        // Create a dummy column, create an empty row is not possible
        await this.metadataTable.row(MAIN_KEY).create({
          [cfName]: {
            created: 1
          }
        });
      }

      const {saveMetadataInSec} = this.config;

      debug(`running interval to cache metadata every ${saveMetadataInSec || DEFAULT_SAVE_INTERVAL_SEC} seconds`);
      this._runIntervalSave(saveMetadataInSec || DEFAULT_SAVE_INTERVAL_SEC);
      this._runIntervalCounts(DEFAULT_COUNTS_INTERVAL_SEC);
    }

    reset() {

      // Initialze all metadata as zero
      DEFAULT_KEYS.forEach(key => {
        this.counts[key] = 0;
      });
    }

    async getAllCount() {

      const row = this.metadataTable.row(MAIN_KEY);
      const counts = await row.get();
      const valueRaw = counts[0].data[MAIN_KEY];
      const value = {};

      DEFAULT_KEYS.forEach(key => {
        value[key] =  this.counts[key] || 0;
        if (valueRaw[key] && valueRaw[key][0] && valueRaw[key][0].value) {
          value[key] += valueRaw[key][0].value;
        }
      });

      return value;
    }

    async getCount(key) {
      
      let value = 0;
      const cfName = this.columnFamilyMetadata.familyName;
      const row = this.metadataTable.row(MAIN_KEY);
      const countsRow = await row.get(`${cfName}:${key}`);

      if (countsRow[0] && 
          countsRow[0].data && 
          countsRow[0].data[MAIN_KEY] && 
          countsRow[0].data[MAIN_KEY][key] && 
          countsRow[0].data[MAIN_KEY][key][0] && 
          countsRow[0].data[MAIN_KEY][key][0].value) {

        // Set the value from the value found from the table
        value = countsRow[0].data[MAIN_KEY][key][0].value;
      }

      // If not found, return the value from the internal memory
      value += (this.counts[key] || 0);
      
      // if it contains negative, just return 0
      return value < 0 ? 0 : value;
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
            //incrementing with negative values works as decrease
            await row.increment(`${cfname}:${key}`, val);
            return val;
          }));
    }

    _runIntervalSave(saveMetadataInSec) {

      this._tov = setTimeout(async () => {
          try {
            await this.save();

            // Reset if it is successful
            this.reset();
          } catch(err) {
            debug("saving to metadata failed", err);
          }

          this._runIntervalSave(saveMetadataInSec);
      }, saveMetadataInSec * 1000);
    }

    _runIntervalCounts(intervalSec) {

      this._tovGetCount = setTimeout(async () => {
          try {
            const counts = await this.getAllCount();
            this.yildiz.metrics.set("nodes_count", counts.nodes);
            this.yildiz.metrics.set("edges_count", counts.edges);
            this.yildiz.metrics.set("ttls_count", counts.ttls);
          } catch(err) {
            debug("failed to get all count", err);
          }
          this._runIntervalCounts(intervalSec);
      }, intervalSec * 1000);
    }

    async close() {
      
      if(this._tov){
        clearTimeout(this._tov);
      }

      if(this._tovGetCount){
        clearTimeout(this._tovGetCount);
      }

      await this.save();
    }
}

module.exports = Metadata;