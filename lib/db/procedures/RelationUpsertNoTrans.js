"use strict";

const debug = require("debug")("yildiz:procedure:relationupsert");
const Procedure = require("./Procedure.js");

class RelationUpsertNoTrans extends Procedure {

    constructor(yildiz){
        super("y_relation_upsert_nt", yildiz);
    }

    async call(identifier1, identifier2, data1, data2, value1, value2, ttld, relation, data3, mode){
        const startTime = Date.now();
        const upsertNodes = `CALL ${super.getName()}(:identifier1, :identifier2, :data1, :data2, :value1, :value2, :ttld, :relation, :data3, :mode);`;
        return await this.yildiz.raw(upsertNodes, {
            identifier1,
            identifier2,
            data1: JSON.stringify(data1),
            data2: JSON.stringify(data2),
            value1,
            value2,
            ttld: !!ttld ? 1 : 0,
            relation,
            data3: JSON.stringify(data3),
            mode: !!mode ? 1 : 0
        }).then(results => {

            if(!results || !Array.isArray(results) ||
                typeof results[0] !== "object" || !results[0]){
                    debug("Procedure result was malformed.", results);
                    throw new Error("Procedure result was malformed.");
                }

            const [result, _] = results;
            const {id1, id2, edgeId} = result["0"];

            const diff = Date.now() - startTime;
            debug("procedure call took", diff, "ms");

            return {
                leftNodeId: id1,
                rightNodeId: id2,
                edgeId,
                leftNodeIdentifier: identifier1,
                rightNodeIdentifier: identifier2
            };
        });
    }

    async storeProcedure(force = false){

        const edgeTable = `${this.yildiz.prefix}_edges`;
        const nodeTable = `${this.yildiz.prefix}_nodes`;
        const translateTable = `${this.yildiz.prefix}_translates`;

        const firstNode = "left_node_id";
        const secondNode = "right_node_id";

        try {

            if(force){
                await this.yildiz.spread(`DROP PROCEDURE IF EXISTS ${super.getName()};`);
            }
    
            const doesExist = await super.procedureExists();
            if(doesExist){
                debug(super.getName(), "procedure already exists.");
                return;
            }
        } catch(error){
            debug("Failed to check for procedure status", super.getName(), error.message);
            return;
        }

        const procedure = `CREATE PROCEDURE ${super.getName()}
            (
                IN identifier1 BIGINT(20),
                IN identifier2 BIGINT(20),
                IN data1 JSON,
                IN data2 JSON,
                IN value1 VARCHAR(250),
                IN value2 VARCHAR(250),
                IN ttld BOOL,
                IN relation BIGINT(20),
                IN data3 JSON,
                IN depthBeforeCreation BOOL
            )
            BEGIN
                DECLARE nodeId1 BIGINT(20);
                DECLARE nodeId2 BIGINT(20);
                DECLARE edgeId BIGINT(20);
                DECLARE edgeCount INT(8);

                SELECT id INTO nodeId1 FROM ${nodeTable} WHERE identifier = identifier1;
                SELECT id INTO nodeId2 FROM ${nodeTable} WHERE identifier = identifier2;

                IF (nodeId1 IS NULL) THEN

                    INSERT INTO ${nodeTable} (identifier, data, created_at, ttld)
                    VALUES (identifier1, data1, NOW(), ttld);

                    INSERT INTO ${translateTable} (identifier, value, created_at, ttld)
                    VALUES (identifier1, value1, NOW(), ttld);

                    SELECT id INTO nodeId1 FROM ${nodeTable} WHERE identifier = identifier1;
                END IF;

                IF (nodeId2 IS NULL) THEN

                    INSERT INTO ${nodeTable} (identifier, data, created_at, ttld)
                    VALUES (identifier2, data2, NOW(), ttld);

                    INSERT INTO ${translateTable} (identifier, value, created_at, ttld)
                    VALUES (identifier2, value2, NOW(), ttld);

                    SELECT id INTO nodeId2 FROM ${nodeTable} WHERE identifier = identifier2;
                END IF;

                IF (depthBeforeCreation) THEN

                    SELECT COUNT(1) INTO edgeCount FROM ${edgeTable} 
                    WHERE ${firstNode} = nodeId1
                    AND ${secondNode} = nodeId2;

                    IF (edgeCount > 1) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Depth mode requires unique edges (id1, id2)', MYSQL_ERRNO = 1001;
                    END IF;

                    /* we expect, that there is only one edge in depth mode */
                    SELECT id INTO edgeId FROM ${edgeTable} 
                    WHERE ${firstNode} = nodeId1
                    AND ${secondNode} = nodeId2;

                    IF (edgeId IS NULL) THEN

                        INSERT INTO ${edgeTable} (${firstNode}, ${secondNode}, relation, data, ttld, created_at, depth)
                        VALUES (nodeId1, nodeId2, relation, data3, ttld, NOW(), 1);

                        SELECT id INTO edgeId FROM ${edgeTable} 
                        WHERE ${firstNode} = nodeId1
                        AND ${secondNode} = nodeId2;
                    ELSE
                        UPDATE ${edgeTable} SET depth = depth + 1
                        WHERE ${firstNode} = nodeId1
                        AND ${secondNode} = nodeId2;
                    END IF;
                ELSE
                    /* in edge mode, we dont care about existing edges, we just create a new one */
                    INSERT INTO ${edgeTable} (${firstNode}, ${secondNode}, relation, data, ttld, created_at, depth)
                    VALUES (nodeId1, nodeId2, relation, data3, ttld, NOW(), 1);

                    SELECT id INTO edgeId FROM ${edgeTable}
                    WHERE ${firstNode} = nodeId1
                    AND ${secondNode} = nodeId2
                    AND relation = relation
                    ORDER BY created_at DESC
                    LIMIT 1;
                END IF;

                SELECT nodeId1 AS id1, nodeId2 AS id2, edgeId;
            END`;

        debug("storing procedure");
        return await this.yildiz.spread(procedure);
    }
}

module.exports = RelationUpsertNoTrans;