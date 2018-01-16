# yilidzdb changelog

## 4.0.0

- depth increases / decreases are now handled by a job on the edge table called DepthWalker
- depth increases are therefore a lot faster, as they the actual update statements only run
        in batched collections every few minutes
- depth operations are stored in their own table
- procedures have been altered accordingly
- a new procedure DepthTransfer has been added to deal with depth increases from within the job
- NodeHandler has been altered to deal with new increase solution
- yildiz now spawns jobs in a different row
- procedure loader now enables configs for procedures and generic initialisation

## 3.0.0

- changing from auto increment to self generated ids based on uuid.v4 hashes
- refactored strToInt
- added /lib/utils

## 2.1.0

- removed depth increase update due to deadlock from procedure
- fixed bug in get translation endpoint, missing await

## 2.0.1

- fixed version replacement in procedure

## 2.0.0

- **BREAKING** renamed upsert-singular-relation-transaction to upsert-singular-relation-no-transaction
- **BREAKING** stored procedures now use the package version as part of their name
- added SET TRANSACTION ISOLATION LEVEL READ COMMITTED; to upsert relation procedure
- fixed edge relation in upsert relation procedure from VARCHAR to BIGINT

## 1.31.0

- added additional procedure and endpoint to run relation upsert without transaction per default
- and via "/access/upsert-singular-relation-transaction" with transaction wrapped procedure

## 1.30.0

- sequelize constraint errors on node or translation creation now return a proper 409 error code
- not found errors are caught on logged without stack trace in error handler now
- fixed logging of successfull creation with better timing

## 1.29.0

- added new http endpoint "/access/upsert-singular-relation"
- added new procedure handling, based on ProcedureLoader
- added new GraphAccess function "upsertSingleEdgeRelationBetweenNodes"
- added upsert relation procedure
- added integration test for upsert-singular-relation

## 1.28.1

- fixed bug in access-log

## 1.28.0

- fixed bug where gauge required label during initialisation
- removed log4bro package
- writing custom access logs now
- added full json log modus to binary by overwriting debug module output

## 1.27.0

- fixed bug in avg response time stats
- added gauge metric for avg response time stats

## 1.25.0 + 1.26.0

- env vars for access management

## 1.24.0

- added access management
- added security integration test

## 1.23.0

- added custom error handler to log events correctly
- added http response error stat and metric
- added average response time stats

## 1.22.0

- switched env vars in bin to "YILDIZDB_" prefix

## 1.21.0

- removed metrics block if factory stats werent present

## 1.20.0

- **breaking** changed schema of stats, factory related object is now a subobject of stats {factory, http}
- added stats for ttl jobs and http server
- metrics now ready
- switched dependencies from ^ to ~

## 1.19.1

- kickoff changelog