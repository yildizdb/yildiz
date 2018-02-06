"use strict";

const moment = require("moment");
const debug = require("debug")("yildiz:lifetime");

class Lifetime {

    constructor(yildiz, options = {}){

        this.yildiz = yildiz;
        const {
            ttlTable, 
            nodeTable, 
            popnodeTable,
            columnFamilyNode
        } = this.yildiz.models;

        this.metadata = this.yildiz.metadata;

        this.options = options;
        this.ttlTable = ttlTable;
        this.nodeTable = nodeTable;
        this.popnodeTable = popnodeTable;

        this.columnFamilyNode = columnFamilyNode;
        
        this._intv = null;
        this._init();
    }

    async _getTTLIds(type) {

        if (!type) {
            return [];
        }
        
        const now = new Date();

        return await new Promise((resolve, reject) => {

            const results = [];

            this.ttlTable.createReadStream({
                filter: [{
                    row: new RegExp(`.*${type}$`)
                },
                {
                    time: {
                        start: moment().subtract(this.options.lifeTimeInSec, "seconds").toDate(),
                        end: new Date()
                    }
                }]
            })
            .on("error", err => {
                reject(err);
            })
            .on("data", n => {
                results.push(n.id);
            })
            .on("end", n => {
                resolve(results);
            });
        });
    }

    _deleteTable() {

        const remove = (type) => {

            return async (keys) => {

                const tableName = type + "Table";
                const metadataType = type + "s";

                let cleanedKeys = keys;
                let deletedCounts = [];

                // If it is not ttl, need to get the real key
                if (type !== "ttl") {
                    cleanedKeys = keys.map(keyRaw => keyRaw.split("_")[0]);
                }

                // If it is not edge, just delete the row from the table
                if (type !== "edge") {
                    deletedCounts = await Promise.all(
                        cleanedKeys.map(key => this[tableName].row(key).delete())
                    );
                }

                // If it is edge, need to get the nodeKey and remove the cell on the node table
                if (type === "edge") {

                    const cfName = this.columnFamilyNode.familyName;

                    deletedCounts = await Promise.all(
                        cleanedKeys.map(key => {
                            const nodeKey = key.split("-")[0];
                            const columnKey = key.split("-")[1];
       
                            return this.nodeTable.row(nodeKey).deleteCells([
                                `${cfName}:${columnKey}`
                            ]);
                        }
                    ));
                }

                if (this.metadata) {
                    this.metadata.decreaseCount(metadataType, deletedCounts.length);
                }

                return { success: deletedCounts.length };
            };
        };

        return {
            node: remove("node"),
            popnode: remove("popnode"),
            edge: remove("edge"),
            ttl: remove("ttl")
        };
    }

    _init(){

        let {
            active,
            lifeTimeInSec,
            jobIntervalInSec,
        } = this.options;

        this.options.lifeTimeInSec = lifeTimeInSec || 86400;
        jobIntervalInSec = jobIntervalInSec || 120;

        if(!active){
            return debug("ttl job deactivated.");
        }

        debug(`ttl job active running every ${jobIntervalInSec} sec, deleting all ttld flags after ${this.options.lifeTimeInSec} sec.`);

        this._runJob(jobIntervalInSec);
    }

    _runJob(jobIntervalInSec) {

        this._tov = setTimeout(() => {

            const startTime = Date.now();
            this._job().then(affected => {
                const diff = Date.now() - startTime;
                debug(`ttl job done took ${diff} ms, removed ${affected.rowCount} rows, from ${affected.tableCount} tables.`);
                this._runJob(jobIntervalInSec);
            }).catch(error => {
            
                debug("ttl job failed.", error);
                this._runJob(jobIntervalInSec);
            });
        }, jobIntervalInSec * 1000);
    }

    async _job(){

        const deleteTTLOrigin = this._deleteTable();

        const results = [];

        // Remove Nodes and TTLs
        const nodeKeys = await this._getTTLIds("nodes");
        results.push(await deleteTTLOrigin.node(nodeKeys));

        const popnodeKeys = await this._getTTLIds("popnodes");
        results.push(await deleteTTLOrigin.popnode(popnodeKeys));

        const edgeKeys = await this._getTTLIds("edges");
        results.push(await deleteTTLOrigin.edge(edgeKeys));

        const ttlKeys = nodeKeys.concat(edgeKeys);
        results.push(await deleteTTLOrigin.ttl(ttlKeys));
        
        return {
            rowCount: results.map(n => n.success).reduce((a, b) => a + b, 0),
            tableCount: results.length
        };
    }

    close(){
        if(this._intv){
            debug("stopping ttl job.");

            if (this._tov) {
                clearTimeout(this._tov);
            }
        }
    }
}

module.exports = Lifetime;