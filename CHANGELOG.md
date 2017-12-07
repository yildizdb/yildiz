# yilidzdb changelog

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