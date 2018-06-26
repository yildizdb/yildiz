# yilidzdb changelog

# 8.1.0

- fixed bug in redis client initialisation, now starting and dropping a new client with every yildiz instance (life cycle)

# 8.0.0

- new fastify  and google bigtable client
- added new cache jobs
- added new ttl cell deletion jobs

# 7.0.0

- adapted documentation (not yet fully done though)
- updated dependencies (especially "@google-cloud/bigtable": "~0.12.1")
- (fastify, prom-client coming soon)

# 6.13.0

- rewrote table schema to a single node table

# 6.12.0

- added toobusy to prevent http server meltdown
- adjusted cache times (decreased)
- more checks and data cleansing for upsert relation

# 6.11.0

- improved performance of upsert relation by improving edge id appending

## 6.9.0 -> 6.10.0

- upgraded fastify, found listening bug for docker cases (bind interface..)
- refactoring edge id logic, for faster lookups
- in non depth mode, relation must be unique now and are always used as integers (hash representation)

## 6.8.0

- switched to major as of bigtable support (docu still to go)
- improved lookup performance for edges in upsert relation
- increased default cache time for edges and nodes

## 5.6.0 -> 5.7.0

- rolled back and forth for fastify

## 5.5.0

- removed "id" field from schemas of incoming params, because of new ajv warnings
- added HEAD, OPTIONS and 404 to http test

## 5.4.0

- now accepting HEAD requests properly
- fixed 404 non returning in error handler

## 5.3.0

- refactored and optimized bigtable backend implementation

## 5.2.0

- refactored project struture to allow different backends
- added google bigtable as backend

## 5.1.0 - RELEASE-NAME: Tomahawk

- improved logs
- added metrics for procedure and depth walker execution
- added retry for upsert relation procedure on deadlock
- added additional error handling (different treatment) for constraints and deadlocks for upsert relation
- fixed bug in depth walker for postgres
- added metrics for deadlock and constraint errors on upsert relation

## 5.0.1

- Fix bug on `upsert` procedure sql on `depthBeforeCreation` is false

## 5.0.0

- **added parallel Postgres mode**
- yildiz now supports MySQL and Postgres as backends
- moved mysql2 and pg modules to optionalDependencies
- adjusted code to support second db backend
- added second version of procedures to support additional postgres backend
- adjusted new depth increase logic to work with postgres backend
- adjusted docs
- adjusted pjson scripts to work with mysql and postgres
- added new docker-compose for postgres

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