# yildiz - HTTP graph layer on top of MySQL or Postgres

high performance graph database on top of MySQL or Postgres

## Features

* **DISCLAIMER**: YildizDB is still changing a lot, it is not yet recommended for production use.
* multi-tenancy/table-size management through table prefixes (with [access management](docs/access.md))
* high read and write performance
* lightweight deployments (small Node.js footprint) + scales easily
* sits on top of any MySQL >= 5.7 or Postgres >= 10.1 database
* able to handle billions of edges and nodes
* ttl feature for all resources
* attach **dynamic data** to edges and nodes (as JSON columns)
* extend the existing table schema through `_extend` options
* prometheus metrics are [exposed](docs/metrics.md)

## Build for High Throughput

* Highly async API based on `fastify`, `sequelize` and an in-memory cache
* Hashing string keys into **integer** representations via `murmurhash3`
* Benchmark Results [here](docs/performance.md)

## Usage

* Use as application: `npm install -g yildiz` and `yildizdb -p 3058 -l /path/to/config.json`
* Use right [alongside your code](example/yildiz-sample.js)
* Spawn server via [http interface](example/yildiz-http.js)

## Easy Setup with Docker & Docker-Compose

* if you have docker and docker-compose installed you can setup yildiz locally super easy:
* `git clone https://github.com/yildizdb/yildiz`
* `cd yildiz`
* `docker-compose up --build`
* this will start a MySQL Database, Adminer Admin UI @ `http://localhost:8080` and yildiz @ `http://localhost:3058`
* it will pull its config from `config/docker.json`

## Available Clients

* [Node.js](https://github.com/yildizdb/yildiz-js)
* **Any Http Client** can be used to access the HTTP-Interface

## Documentation

* `yildiz` means :star: in turkish
* [Http interface curl examples](docs/curl.md)
* [Open API/Swagger JSON](docs/swagger.json)
* [Why develop another graph database?](docs/why.md)
* [How does it work?](docs/how.md)
* [Storing node relations even faster](docs/fast-relation-creation.md)
* [yildiz use-cases](docs/use-case.md)
* [Access management](docs/access.md)
* [Stats and metrics](docs/metrics.md)

## Developing yildiz with MySQL backend

* start database via docker `yarn mysql:start`
* run tests via `yarn test` for MySQL
* run tests with SQL debugging via `yarn sql`
* start http-server via `yarn http`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`
* stop database via `yarn mysql:stop`

## Developing yildiz with Postgres backend

* start database via docker `yarn psql:start`
* run tests via `yarn test:psql` for Postgres
* start http-server via `yarn http:psql`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`
* stop database via `yarn psql:stop`

## Misc

* Yildiz exposes Prometheus Metrics @ `/admin/metrics`
* Yildiz exposes JSON stats @ `/admin/stats`