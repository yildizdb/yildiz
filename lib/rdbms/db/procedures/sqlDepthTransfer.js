"use strict";

module.exports = (replacement, type) => {

    const {
        procedureName,
        edgeTable,
        depthTable,
        minAge,
        minAgeType
    } = replacement;

    const template = {
        mysql:
            `CREATE PROCEDURE ${procedureName}
            (
                IN edgeId BIGINT(20)
            )
            BEGIN
                DECLARE depthCount INT(8);

                DECLARE EXIT HANDLER FOR 1001
                BEGIN
                    ROLLBACK;
                    RESIGNAL;
                END;

                DECLARE EXIT HANDLER FOR SQLEXCEPTION 
                BEGIN
                    ROLLBACK;
                    RESIGNAL;
                END;

                SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
                START TRANSACTION;

                SELECT COUNT(1) INTO depthCount
                FROM ${depthTable}
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ${minAge} ${minAgeType})
                AND edge_id = edgeId;

                IF (depthCount > 0) THEN

                    UPDATE ${edgeTable}
                    SET depth = depth + depthCount
                    WHERE id = edgeId;

                    DELETE FROM ${depthTable}
                    WHERE created_at < DATE_SUB(NOW(), INTERVAL ${minAge} ${minAgeType})
                    AND edge_id = edgeId;
                END IF;

                COMMIT;
                SELECT depthCount;
            END`,

        postgres: 
            `CREATE FUNCTION ${procedureName}
            (
                IN edgeId BIGINT,
                OUT depthCount INT
            )
            AS $$

            BEGIN

                SELECT COUNT(1) INTO depthCount
                FROM ${depthTable}
                WHERE created_at < (NOW() - INTERVAL '${minAge} ${minAgeType}')
                AND edge_id = edgeId;

                IF (depthCount > 0) THEN
                    UPDATE ${edgeTable}
                    SET depth = depth + depthCount
                    WHERE id = edgeId;

                    DELETE FROM ${depthTable}
                    WHERE created_at < (NOW() - INTERVAL '${minAge} ${minAgeType}')
                    AND edge_id = edgeId;
                END IF;

            END;
            $$ LANGUAGE plpgsql;`
    };

    return template[type];
}