"use strict";

const debug = require("debug")("yildiz:metadata");

const DEFAULT_TABLES = [
    "translates",
    "edges",
    "nodes",
    "ttls",
];

class Metadata {

    constructor(yildiz){
      this.yildiz = yildiz;
      this.config = this.yildiz.config.metadata || {};
      this.count = {};
      this._reset();
    }

    async _reset() {

      // Initiialze all metadata as zero
      DEFAULT_TABLES.forEach(n => {
        this.count[n] = 0;
      });
    }

    async getCount(table) {

      // Chris: the get interface needs to read from big table
      // Chris: its probably a good idea to have a second interval that polls the latest 
      // counts from the database and uses these to serve on the get endpoint 
      // (this way we can cache the requests easily -> and we can also use them to provide
      // stats and metrics.

      // TODO: Need to discuss this
      // this.count = await this._getCountFromBT();

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

      debug(this.count);

      return this.count[table];
    }

    async save() {

        const CFName = this.columnFamilyMetadata.familyName;

        const val = {
            key: "count",
            data: {
                [CFName] : this.count
            }
        };

        this._reset();

        await this.metadataTable.insert([val]);
      }

      async _getCountFromBT() {

        let result = {};
        const row = this.metadataTable.row("count");
        const CFName = this.columnFamilyMetadata.familyName;

        try {
            const rowGet = await row.get();
            const raw = rowGet && rowGet[0] && rowGet[0].data && rowGet[0].data[CFName];
            Object.keys(raw).forEach(n => {
              result[n] = raw[n][0].value;
          });
        }
        catch (err) {
            result = this.count;
        }

        return result;
    }

    async generateTableAndCF(instance) {

      // Get or Create metadata table
      const metadataTableName = `${this.yildiz.prefix}_metadata`;
      this.metadataTable = instance.table(metadataTableName);
      const metadataTableExists = await this.metadataTable.exists();
      if (!metadataTableExists || !metadataTableExists[0]) {
          await this.metadataTable.create(metadataTableName);
      }

      // Get or Create metadata columnFamily
      this.columnFamilyMetadata = this.metadataTable.family("metadata");
      const columnFamilyMetadataExists = await this.columnFamilyMetadata.exists();
      if (!columnFamilyMetadataExists || !columnFamilyMetadataExists[0]) {
          await this.columnFamilyMetadata.create("metadata");
      }

      debug("tables/families generated.");

      // TODO: Need to discuss this
      // const {saveMetadataInSec} = this.config || 2;
      // this._runInterval(saveMetadataInSec);
    }

    _runInterval(saveMetadataInSec) {

      debug(`running interval to cache metadata every ${saveMetadataInSec} seconds`);

      this._intv = setInterval(async () => {
          try {
            await this.save();
            debug("saving to metadata.");
          }
          catch(err) {
            debug("saving to metadata failed", err);
          }
      }, saveMetadataInSec * 1000);
  }

    async close() {
      clearInterval(this._intv);
      await this.save();
    }
}

module.exports = Metadata;