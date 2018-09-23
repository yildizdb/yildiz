import Debug from "debug";
import Bluebird from "bluebird";
import Bigtable from "@google-cloud/bigtable";

import { Yildiz } from "../Yildiz";
import { CountObject } from "../../interfaces/TTL";

const debug = Debug("yildiz:metadata");

const MAIN_KEY = "metadata";

const DEFAULT_SAVE_INTERVAL_SEC = 2;
const DEFAULT_COUNTS_INTERVAL_SEC = 5;
const DEFAULT_KEYS = [
  "nodes", // table
  "edges", // qualifiers on nodes table
  "ttls",  // table
];

export class Metadata {

  private yildiz: Yildiz;
  private counts: CountObject;

  private tov!: NodeJS.Timer | number;
  private tovGetCount!: NodeJS.Timer | number;

  private metadataTable: Bigtable.Table;
  private columnFamilyMetadata: Bigtable.Family;

  private promiseConcurrency: number;

    constructor(yildiz: Yildiz) {

      this.yildiz = yildiz;
      this.counts = {
        edges: 0,
        nodes: 0,
        ttls: 0,
      };

      const {
        metadataTable,
        columnFamilyMetadata,
      } = this.yildiz.models;

      this.metadataTable = metadataTable;
      this.columnFamilyMetadata = columnFamilyMetadata;
      this.promiseConcurrency = this.yildiz.config.promiseConcurrency || 1000;
    }

    public async init() {

      this.reset();

      const rowExists = await this.metadataTable.row(MAIN_KEY).exists();
      const cfName = this.columnFamilyMetadata.id;

      if (!rowExists || !rowExists[0]) {

        // Create a dummy column, create an empty row is not possible
        await this.metadataTable.row(MAIN_KEY).create({
          entry: {
            [cfName]: {
              created: 1,
            },
          },
        });
      }

      const {
        saveMetadataInSec = DEFAULT_SAVE_INTERVAL_SEC,
        readMetadataInSec = DEFAULT_COUNTS_INTERVAL_SEC,
      } = this.yildiz.config.metadata || {};

      debug(`running interval to cache metadata every ${saveMetadataInSec} seconds`);
      this.runIntervalSave(saveMetadataInSec);

      debug(`running interval to read metadata every ${readMetadataInSec} seconds`);
      this.runIntervalCounts(readMetadataInSec);
    }

    private reset() {

      // Initialze all metadata as zero
      DEFAULT_KEYS.forEach((key: string) => {
        this.counts[key] = 0;
      });
    }

    public async getAllCount(): Promise<CountObject> {

      const row = this.metadataTable.row(MAIN_KEY);
      const counts = await row.get();
      const valueRaw = counts[0].data[MAIN_KEY];
      const value: CountObject = {
        edges: 0,
        nodes: 0,
        ttls: 0,
      };

      DEFAULT_KEYS.forEach((key: string) => {
        value[key] =  this.counts[key] || 0;
        if (valueRaw[key] && valueRaw[key][0] && valueRaw[key][0].value) {
          value[key] += valueRaw[key][0].value;
        }
      });

      return value;
    }

    public async getCount(key: string) {

      let value = 0;
      const cfName = this.columnFamilyMetadata.id;
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

    public increaseCount(key: string, amount: number = 1) {

      if (typeof this.counts[key] === undefined) {
        return 0;
      }

      (this.counts[key]) += amount;
      return this.counts[key];
    }

    public decreaseCount(key: string, amount: number = 1) {

      if (typeof this.counts[key] === undefined) {
        return 0;
      }

      (this.counts[key]) -= amount;
      return this.counts[key];
    }

    /**
     * save syncs the in memory state of this.counts
     * to the single metadata row as qualifier increments
     * these are atomic, in memory state will be reset to 0
     */
    private async save() {

        const cfname = this.columnFamilyMetadata.id;
        const row = this.metadataTable.row(MAIN_KEY);

        return await Bluebird.map(
          Object.keys(this.counts),
          async (key: string) => {

            if (this.counts[key] === 0 || isNaN(this.counts[key])) {
              return 0;
            }

            const val = this.counts[key];

            // Incrementing with negative values works as decrease
            await row.increment(`${cfname}:${key}`, val);
            this.counts[key] = 0;

            return val;
          },
          {
            concurrency: this.promiseConcurrency,
          },
        );
    }

    private runIntervalSave(saveMetadataInSec: number) {

      this.tov = setTimeout(async () => {

          try {
            await this.save();
          } catch (err) {
            debug("saving to metadata failed", err);
          }

          this.runIntervalSave(saveMetadataInSec);
      }, saveMetadataInSec * 1000);
    }

    private runIntervalCounts(intervalSec: number) {

      this.tovGetCount = setTimeout(async () => {

          try {
            const counts = await this.getAllCount();
            this.yildiz.metrics.set("nodes_count", counts.nodes);
            this.yildiz.metrics.set("edges_count", counts.edges);
            this.yildiz.metrics.set("ttls_count", counts.ttls);
          } catch (err) {
            debug("failed to get all count", err);
          }

          this.runIntervalCounts(intervalSec);
      }, intervalSec * 1000);
    }

    public async close() {

      if (this.tov) {
        clearTimeout(this.tov as NodeJS.Timer);
      }

      if (this.tovGetCount) {
        clearTimeout(this.tovGetCount as NodeJS.Timer);
      }

      await this.save();
    }
}
