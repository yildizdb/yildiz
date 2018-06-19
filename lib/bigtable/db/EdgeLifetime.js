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

  _runJob() {

    let keys = null;
    const intervalInMs = this.deleteIntervalInSec * 1000;

    this._tov = setTimeout(async () => {

      try {
        await this._jobAction();
      } catch(error) {
        debug("error while running job", error);
      }
      this._runJob();

    }, intervalInMs);
  }

  async _jobAction() {

    const expiredTimestamps = Date.now() - (this.edgeTTLInSec * 1000);

    const edges = await this._scan(expiredTimestamps);

    if (edges.length) {
      try {
        await this._deleteEdges(edges, expiredTimestamps);
      } catch (error) {
        debug("error while deleting", error);
      }
    }
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

      const edgeSplit = edges[i].split("#");
      const fnId = edgeSplit[0];
      const snId = edgeSplit[1];
      const relation = edgeSplit[2];
  
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
    this._runJob();
    this.initiatedStatus = true;
  }

  bumpEdgeTTLFireAndForget(fnId, snId, relation) {

    if (!this.initiatedStatus) {
      return;
    }

    const edgeId = `${fnId}#${snId}${relation ? "#" + relation : ""}`;
    debug("set edge", edgeId);

    this.redisClient.setEdgeId(edgeId)
      .catch((error) => {
        // Do nothing
      });
  }

  removeEdgeTTLFireAndForget(fnId, snId, relation) {

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

    this.redisClient.removeEdgeId(edgeId)
      .catch((error) => {
        // Do nothing
      });

    this.redisClient.removeEdgeId(edgeIdSwapped)
      .catch((error) => {
        // Do nothing
      });
  }

  async removeEdgeTTLFromNodeFireAndForget(identifier) {

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
            this.removeEdgeTTLFireAndForget(edges[i]);
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