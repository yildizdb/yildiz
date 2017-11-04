# krakn - Graph Database on top of MySQL

high performance relations (Graph) database on top of MySQL

## Features

* multi-tenancy through table prefixes
* high read and write performance
* lightweight deployments (small Node.js footprint)
* scales easily
* sits on top of any MySQL database (easy to adapt to Postgres, MSSQL or SQLite3)
* able to handle billions of edges and nodes

## Build for High Troughput

* Node.js 8.x 1 core + (Percona) MySQL 5.7 1 core => 5600 ops/sec | MySQL @ 40% cpu
* Node.js 9.x 8 cores + (Percona) MySQL 5.7 4 cores => 38200 ops/sec | MySQL @ 360% cpu
* Highly async API based on `fastify`, `sequelize` and `memory-cache`
* Hashing string keys into **integers** representations via `murmurhash3`

## Usage

* Use right [alongside your code](example/krakn-sample.js)
* Deploy as server and use via [http interface](example/krakn-http.js)

## Why?

TODO

## Available Clients

* [Node.js](https://github.com/krystianity/krakn-js)

## Documentation

* [Http Interface Curl Examples](docs/curl.md)
* [Open API/Swagger JSON](docs/swagger.json)

## Developing krakn

* start database via docker `yarn db:start`
* run tests via `yarn test`
* run tests with SQL debugging via `yarn sql`
* start http-server via `yarn http`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`
* stop database via `yarn db:stop`