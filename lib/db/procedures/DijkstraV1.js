"use strict";

const Procedure = require("./Procedure.js");

//WIP
class DijkstraV1 extends Procedure {

    constructor(yildiz){
        super("dijkstrav1", yildiz);
    }

    async call(){
        //TODO
    }

    async storeProcedure(){

        return; //TODO WIP

        const prefix = this.yildiz.prefix;

        const query = `DROP PROCEDURE IF EXISTS  ${prefix}_${this.name};
            DELIMITER //
            CREATE PROCEDURE ${prefix}_${this.name}
            (IN startnode INT,
            IN endnode INT)
            this_proc:BEGIN
                DECLARE fromnode INT;
                DECLARE currentestimate INT;
                START TRANSACTION;
                DROP TABLE IF EXISTS ${prefix}_nodes_temporary;
                CREATE TABLE ${prefix}_nodes_temporary
                (
                    id INT NOT NULL PRIMARY KEY,
                    estimate DECIMAL(10,3) NOT NULL,
                    predecessor INT NULL,
                    done BIT NOT NULL
                );
                INSERT INTO ${prefix}_nodes_temporary (id, estimate, predecessor, done)
                SELECT id, 9999999.999, NULL, 0 FROM ${prefix}_nodes;
                UPDATE ${prefix}_nodes_temporary SET estimate = 0 WHERE id = startnode;
                IF ROW_COUNT()<>1 THEN
                    DROP TABLE ${prefix}_nodes_temporary;
                    ROLLBACK;
                    SELECT 'Could not find startnode.';
                    LEAVE this_proc;
                END IF;
                update_estimates:WHILE 1 = 1 DO
                    SET fromnode = NULL;
                
                    SELECT id, estimate
                    INTO fromnode, currentestimate
                    FROM ${prefix}_nodes_temporary WHERE done = 0 AND estimate < 9999999.999
                    ORDER BY estimate
                    LIMIT 1;
                    IF fromnode IS NULL OR fromnode = endnode THEN
                        LEAVE update_estimates;
                    END IF;
                
                    UPDATE ${prefix}_nodes_temporary SET done = 1 WHERE id = fromnode;
                
                    UPDATE ${prefix}_nodes_temporary n INNER JOIN ${prefix}_edges e ON n.id = e.tonode
                    SET estimate = currentestimate + e.weight, predecessor = fromnode
                    WHERE done = 0 AND e.fromnode = fromnode AND (currentestimate + e.weight) < n.estimate;
                END WHILE;
                WITH recursive BacktraceCTE(id, identifier, distance, path, namepath)
                AS (
                    SELECT n.id, nn.identifier, n.estimate, CAST(n.id AS char(8000)),
                    CAST(nn.identifier AS char(8000))
                    FROM ${prefix}_nodes_temporary n JOIN ${prefix}_nodes nn ON n.id = nn.id
                    WHERE n.id = startnode
                    UNION ALL
                    SELECT n.id, nn.identifier, n.estimate,
                    CONCAT(cte.path , ',' , n.id),
                    CONCAT(cte.namepath, ',' , nn.identifier)
                    FROM ${prefix}_nodes_temporary n JOIN BacktraceCTE cte ON n.predecessor = cte.id
                    JOIN ${prefix}_nodes nn ON n.id = nn.id
                )
                SELECT id, identifier, distance, path, namepath FROM BacktraceCTE
                WHERE id = endnode OR endnode IS NULL
                ORDER BY id;   
                DROP TABLE ${prefix}_nodes_temporary;
                COMMIT;
            END //
            DELIMITER ;`;

        return this.yildiz.spread(query);
    }
}

module.exports = DijkstraV1;