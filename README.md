# YildizDB - HTTP event relation storage layer

<p align="center">
  <img alt="yildiz" src="docs/assets/images/logo.jpeg" width="200">
</p>
<p align="center">
  high performance event relation storage on top of BigTable, MySQL or Postgres
</p>

[![Build Status][build-badge]][build]
[![Version][version-badge]][package]
[![MIT License][license-badge]][license]

## Features

* multi-tenancy/table-size management through table prefixes (with [access management](docs/access.md))
* high read and write performance
* able to handle billions of edges and nodes
* scales beyond Terabytes
* lightweight deployments (small Node.js footprint)
* multiple backends
* ttl feature for all resources

## Available Clients

* [Node.js](https://github.com/yildizdb/yildiz-js)
* **Any Http Client** can be used to access the HTTP-Interface

## Build for High Throughput

* Highly async API based on `fastify` and in-memory + Redis cache
* Hashing string keys into **integer** representations via `murmurhash3`

## Usage

* **We suggest to always use YildizDB with Google Big Table as backend**
* Use as application: `npm install -g yildiz` and `yildizdb -p 3058 -l /path/to/config.json`
* A word on configuration [can be found here](docs/configuration.md)
* Use right [alongside your code](example/yildiz-sample.js)
* Spawn server via [http interface](example/yildiz-http.js)

## Documentation

* `yildiz` means :star: in turkish
* [Best practices / Rules](docs/best-practice.md)
* [Http interface curl examples](docs/curl.md)
* [Open API/Swagger JSON](docs/swagger.json)
* [Access management](docs/access.md)
* [Stats and metrics](docs/metrics.md)
* [YildizDB use-cases](docs/use-case.md)
* [Why develop another graph database?](docs/why.md)
* [How does it work (RBDMS) ?](docs/how-rdbms.md)
* [How does it work (Google Big Table) ?](docs/how-gbt.md)
* [Storing node relations even faster](docs/fast-relation-creation.md)
* [Project History](docs/project-history.md)
* [The popular right node concept](docs/popular-right-node.md)
* [Configuration & Deployments](docs/configuration.md)

## Metrics

* Yildiz exposes Prometheus Metrics @ `/admin/metrics`
* Read more about it [here](docs/metrics.md)

## Developing YildizDB

### Developing yildiz with Google Big Table backend

* run tests via `yarn test:bt` for MySQL
* start http-server via `yarn http:bt`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`

### Developing yildiz with MySQL backend

* start database via docker `yarn mysql:start`
* run tests via `yarn test` for MySQL
* run tests with SQL debugging via `yarn sql`
* start http-server via `yarn http`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`
* stop database via `yarn mysql:stop`

### Developing yildiz with Postgres backend

* start database via docker `yarn psql:start`
* run tests via `yarn test:psql` for Postgres
* start http-server via `yarn http:psql`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`
* stop database via `yarn psql:stop`

### Easy Setup with Docker & Docker-Compose

* if you have docker and docker-compose installed you can setup yildiz locally super easy:
* `git clone https://github.com/yildizdb/yildiz`
* `cd yildiz`
* `docker-compose up --build`
* this will start a MySQL Database, Adminer Admin UI @ `http://localhost:8080` and yildiz @ `http://localhost:3058`
* it will pull its config from `config/docker.json`

## Disclaimer

* This product is not affiliated with Google
* License is MIT [see](LICENSE)

<!-- badges -->
[build-badge]: https://quay.io/repository/yildizdb/yildiz/status "Docker Repository on Quay"
[build]: https://quay.io/repository/yildizdb/yildiz
[version-badge]: https://badge.fury.io/js/yildiz.svg
[package]: https://www.npmjs.com/package/yildiz
[license-badge]: https://img.shields.io/npm/l/yildiz.svg
[license]: https://opensource.org/licenses/MIT
