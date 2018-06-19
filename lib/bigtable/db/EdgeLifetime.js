"use strict";

const moment = require("moment");
const debug = require("debug")("yildiz:edgelifetime");

const { getRedisClient } = require("../cache/RedisClientFactory");

const CACHE_TABLE_TTL = 175;

const ED = "ed";
const EC = "ec";

class EdgeLifetime {

  constructor(options = {}, yildiz, metrics){

    this.redisClient = getRedisClient(options, metrics);
    this.yildiz = yildiz;

    this.initiatedStatus = false;

    const {
      edgeTTLInSec,
      deleteIntervalInSec,
    } = options.edgeLifetime || {};

    this.edgeTTLInSec = edgeTTLInSec;
    this.deleteIntervalInSec = deleteIntervalInSec;
  }

  _runJob(intervalInSec) {

    let keys = null;
    const intervalInMs = intervalInSec * 1000;

    this._tov = setTimeout(async () => {

      try {
        await this._jobAction(intervalInSec);
      } catch(error) {
        debug("error while running job", error);
        this._runJob(intervalInSec);
      }

    }, intervalInSec * 1000);
  }

  async _jobAction(intervalInSec) {

    const expiredTimestamps = Date.now() - (this.edgeTTLInSec * 1000);

    this._scan(expiredTimestamps).then(async edges => {

      if (edges.length) {
        try {
          await this._deleteEdges(edges, expiredTimestamps);
        } catch (error) {
          debug("error while deleting", error);
        }
      }

      this._runJob(intervalInSec);

    }).catch(error => {

      debug("getting expired edges failed.", error);
      this._runJob(intervalInSec);
    });
  }

  async _scan(expiredTimestamps) {

    const edges = await this.redisClient.getExpiredEdges(expiredTimestamps);
    debug(`scanning expired edges, found ${edges.length} edges`);

    return edges || [];
  }

  async _deleteEdges(edges, expiredTimestamps) {

    edges = Array.isArray(edges) ? edges : [edges];

    debug(`deleting expired edges, total: ${edges.length} edges`);

    for (let i = 0; i < edges.length; i++) {

      const edgesplit = edges[i].split("#");
      const fnId = edgesplit[0];
      const snId = edgesplit[1];
      const relation = edgesplit[2];
  
      const nodeHandler = await this.yildiz.getNodeHandler();
      const popNodeKey = `${fnId}#${snId}${relation ? "#" + relation : ""}`;
  
      const removeEdges = await Promise.all([
        nodeHandler.removeEdgeByIds(fnId, snId, relation),
        nodeHandler.removePopNode(popNodeKey)
      ]);
    }

    debug(`deleted expired edges, total: ${edges.length} edges`);
  }


  init() {
    debug(`edge lifetime deletion job initiated`);
    this._runJob(this.deleteIntervalInSec);
    this.initiatedStatus = true;
  }

  bumpEdgeTTL(fnId, snId, relation) {

    if (!this.initiatedStatus) {
      return;
    }

    const edgeId = `${fnId}#${snId}${relation ? "#" + relation : ""}`;
    debug("set edge", edgeId);
    this.redisClient.setEdgeId(edgeId);
  }

  removeEdgeTTL(fnId, snId, relation) {

    if (!this.initiatedStatus) {
      return;
    }
    
    // Either the edge could be swapped or not
    const edgeId = snId ? 
      `${fnId}#${snId}${relation ? "#" + relation : ""}` :
      fnId;

    const edgeIdSwapped = snId ? 
      `${snId}#${fnId}${relation ? "#" + relation : ""}` :
      fnId;

    this.redisClient.removeEdgeId(edgeId);
    this.redisClient.removeEdgeId(edgeIdSwapped);

  }

  async removeEdgeTTLFromNode(identifier) {

    if (!this.initiatedStatus) {
      return;
    }

    const nodeHandler = await this.yildiz.getNodeHandler();
    const rowObject = await nodeHandler.getNodeByIdentifier(identifier);

    if (!rowObject) {
      return;
    }

    const edges = Object.keys(rowObject)
        .filter(key => key.includes(ED) || key.includes(EC))
        .map(key => key.replace(/ed|ec/, identifier));

    if (edges.length) {
        for (let i = 0; i < edges.length; i++) {
            this.removeEdgeTTL(edges[i]);
        }
    }
  }

  close() {
    if (this._tosv) {
      clearTimeout(this._tosv);
    }
  }
}

module.exports = EdgeLifetime;