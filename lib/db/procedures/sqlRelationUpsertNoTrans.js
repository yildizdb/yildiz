"use strict";

module.exports = (replacement, type) => {

    const {
        procedureName,
        edgeTable,
        nodeTable,
        translateTable,
        firstNode,
        secondNode,
        depthTable
    } = replacement;

    const template = {

        mysql:
            `CREATE PROCEDURE ${procedureName}
            (
                IN idEdge BIGINT(20),
                IN idNode1 BIGINT(20),
                IN idNode2 BIGINT(20),
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

                    INSERT INTO ${nodeTable} (id, identifier, data, created_at, ttld)
                    VALUES (idNode1, identifier1, data1, NOW(), ttld);

                    INSERT INTO ${translateTable} (identifier, value, created_at, ttld)
                    VALUES (identifier1, value1, NOW(), ttld);

                    SELECT id INTO nodeId1 FROM ${nodeTable} WHERE identifier = identifier1;
                END IF;

                IF (nodeId2 IS NULL) THEN

                    INSERT INTO ${nodeTable} (id, identifier, data, created_at, ttld)
                    VALUES (idNode2, identifier2, data2, NOW(), ttld);

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

                        INSERT INTO ${edgeTable} (id, ${firstNode}, ${secondNode}, relation, data, ttld, created_at, depth)
                        VALUES (idEdge, nodeId1, nodeId2, relation, data3, ttld, NOW(), 1);

                        /* not needed anymore
                        SELECT id INTO edgeId FROM ${edgeTable} 
                        WHERE ${firstNode} = nodeId1
                        AND ${secondNode} = nodeId2;*/

                        SET edgeId = idEdge;
                    ELSE

                        /* removed due to depth table
                        UPDATE ${edgeTable} SET depth = depth + 1
                        WHERE ${firstNode} = nodeId1
                        AND ${secondNode} = nodeId2;*/

                        INSERT INTO ${depthTable} (edge_id, created_at)
                        VALUES (edgeId, NOW());
                    END IF;
                ELSE
                    /* in edge mode, we dont care about existing edges, we just create a new one */
                    INSERT INTO ${edgeTable} (id, ${firstNode}, ${secondNode}, relation, data, ttld, created_at, depth)
                    VALUES (idEdge, nodeId1, nodeId2, relation, data3, ttld, NOW(), 1);

                    /* not needed anymore
                    SELECT id INTO edgeId FROM ${edgeTable}
                    WHERE ${firstNode} = nodeId1
                    AND ${secondNode} = nodeId2
                    AND relation = relation
                    ORDER BY created_at DESC
                    LIMIT 1; */

                    SET edgeId = idEdge;
                END IF;

                SELECT nodeId1 AS id1, nodeId2 AS id2, edgeId;
            END`,


        postgres:
            `CREATE FUNCTION ${procedureName}
            (
                IN idEdge BIGINT,
                IN idNode1 BIGINT,
                IN idNode2 BIGINT,
                IN identifier1 BIGINT,
                IN identifier2 BIGINT,
                IN data1 JSON,
                IN data2 JSON,
                IN value1 VARCHAR,
                IN value2 VARCHAR,
                IN ttld BOOL,
                IN relation BIGINT,
                IN data3 JSON,
                IN depthBeforeCreation BOOL,
                OUT nodeId1 BIGINT,
                OUT nodeId2 BIGINT,
                OUT edgeId BIGINT
            )
            AS $$

            DECLARE edgeCount INT;

            BEGIN

                SELECT id INTO nodeId1 FROM ${nodeTable} WHERE identifier = identifier1;
                SELECT id INTO nodeId2 FROM ${nodeTable} WHERE identifier = identifier2;

                IF (nodeId1 IS NULL) THEN

                    INSERT INTO ${nodeTable} (id, identifier, data, created_at, ttld)
                    VALUES (idNode1, identifier1, data1, NOW(), ttld);

                    INSERT INTO ${translateTable} (identifier, value, created_at, ttld)
                    VALUES (identifier1, value1, NOW(), ttld);

                    SELECT id INTO nodeId1 FROM ${nodeTable} WHERE identifier = identifier1;
                END IF;

                IF (nodeId2 IS NULL) THEN

                    INSERT INTO ${nodeTable} (id, identifier, data, created_at, ttld)
                    VALUES (idNode2, identifier2, data2, NOW(), ttld);

                    INSERT INTO ${translateTable} (identifier, value, created_at, ttld)
                    VALUES (identifier2, value2, NOW(), ttld);

                    SELECT id INTO nodeId2 FROM ${nodeTable} WHERE identifier = identifier2;
                END IF;

                IF (depthBeforeCreation) THEN

                    SELECT COUNT(1) INTO edgeCount FROM ${edgeTable} 
                    WHERE ${firstNode} = nodeId1
                    AND ${secondNode} = nodeId2;

                    IF (edgeCount > 1) THEN
                    RAISE EXCEPTION 'Depth mode requires unique edges (%, %)', nodeId1, nodeId2
                      USING HINT = 'Please check nodeId1 nodeId2';
                    END IF;

                    /* we expect, that there is only one edge in depth mode */
                    SELECT id INTO edgeId FROM ${edgeTable} 
                    WHERE ${firstNode} = nodeId1
                    AND ${secondNode} = nodeId2;

                    IF (edgeId IS NULL) THEN

                        INSERT INTO ${edgeTable} (id, ${firstNode}, ${secondNode}, relation, data, ttld, created_at, depth)
                        VALUES (idEdge, nodeId1, nodeId2, relation, data3, ttld, NOW(), 1);

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
                    INSERT INTO ${edgeTable} (id, ${firstNode}, ${secondNode}, relation, data, ttld, created_at, depth)
                    VALUES (idEdge, nodeId1, nodeId2, relation, data3, ttld, NOW(), 1);

                    SELECT id INTO edgeId FROM ${edgeTable}
                    WHERE ${firstNode} = nodeId1
                    AND ${secondNode} = nodeId2
                    AND relation = relation
                    ORDER BY created_at DESC
                    LIMIT 1;
                END IF;
            END;
            $$ LANGUAGE plpgsql;`
    };

    return template[type];
}