<h1 align="center">Yildiz Graph Database</h1>
<p align="center">
  <img alt="yildiz" src="docs/images/YildizDBLogo.png" width="362">
</p>
<p align="center">
  Thin graph database layer on top of Google Bigtable.
</p>

[![Build Status][build-badge]][build] [![Version][version-badge]][package] [![MIT License][license-badge]][license] ![node][node-badge] [![Swagger][swagger-badge]][swagger-url]

## Intro

YildizDB acts as a highly scaleable HTTP layer in front of Google Bigtable. It helps you store billions of relations between nodes in edges and resolve them in milliseconds. A small access layer helps you manage multiple namespaces with ease. YildizDB scales to hundrets of Terabytes. YildizDB excells in $N:N$ non nested relationships.

## Features

* simple namespacing (table separation) with [prefixes](docs/access.md)
* simple access management through [tokens](docs/access.md)
* multi-tenancy through table prefixes (with [access management](docs/access.md))
* high read and write performance
* fast read access under heavy write load
* able to handle billions of edges and nodes
* scales beyond Terabytes
* lightweight deployments (small Node.js footprint)
* ttl feature for all resources
* HTTP [Open API][swagger-url]
* Kubernetes HELM [charts](https://github.com/yildizdb/charts)

## Build for high throughput $N:N$

* Highly async API based on `fastify`
* Thin layer on top of Google's GRPC Bigtable API
* Hashing and translating all string identifiers into **integer** representations via `murmurhash3` automatically

## Fast random access to a node's edge data $1:N$

* Multiple complex caching layers
* Custom Bigtable cache table speed up by Google Memorystore (Redis)
* All Memorystore hits also speed up by In-Memory store
* Fetch job that keeps active nodes refreshed in cache

## Available clients

* [Node.js Client](https://github.com/yildizdb/yildiz-js)
* **Any Http Client** can be used to access the HTTP-Interface

## Usage

* **You will need a Google Cloud Project with a running Bigtable cluster**
* **Additionally YildizDB requires a Memorystore (or Redis) instance**
* Configure `./config/bigtable.json` accordingly
* Install and start: `npm install -g yildiz` and `yildizdb -p 3058 -l ./config/bigtable.json`
* A word on configuration [can be found here](docs/configuration.md)
* Use right [alongside your code](example/yildiz-sample.js)
* Spawn server via [http interface](example/yildiz-http.js)

## Deployment

* YildizDB is designed to be deployed as simple platform service
* it requires Node.js > 9.x.x and Redis > 3.x
* It simply requires its npm module as well as a config file that describes
the connections to Bigtable and Memorystore (Redis)
* It scales best with an HTTP load balancer in front of it e.g. NGINX
* We run and scale it very successfully in Google's Kubernetes Engine
* We also offer HELM [charts](https://github.com/yildizdb/charts)
* Read some more about the config file [here](docs/configuration.md)

## Metrics & Monitoring

* Yildiz exposes Prometheus Metrics @ `/admin/metrics`
* Read more about it [here](docs/metrics.md)

## Developing YildizDB

### Developing YildizDB with Google Bigtable backend

* Configure `./config/bigtable.json` accordingly
* Run tests via `yarn test`
* Start via `yarn http`

## Documentation

* `yildiz` means :star: in turkish
* [Best practice](docs/best-practice.md)
* [Open API/Swagger JSON](docs/swagger.json)
* [Access management](docs/access.md)
* [Stats and metrics](docs/metrics.md)
* [YildizDB Use-cases](docs/use-cases.md)
* [Why develop another Graph Database?](docs/why.md)
* [How does it work?](docs/how.md)
* [Storing node relations even faster](docs/fast-relation-creation.md)
* [The popular right node concept](docs/popular-right-node.md)
* ["Depth" or "Create" edge creation](docs/edge-modes.md)
* [Configuration & Deployments](docs/configuration.md)

## Disclaimer

* This project is not affiliated with Google
* License is MIT [see](LICENSE)

<!-- badges -->
[build-badge]: https://quay.io/repository/yildizdb/yildiz/status "Docker Repository on Quay"
[build]: https://quay.io/repository/yildizdb/yildiz
[version-badge]: https://badge.fury.io/js/yildiz.svg
[package]: https://www.npmjs.com/package/yildiz
[license-badge]: https://img.shields.io/npm/l/yildiz.svg
[license]: https://opensource.org/licenses/MIT
[swagger-url]: https://petstore.swagger.io/?url=https://raw.githubusercontent.com/yildizdb/yildiz/master/docs/swagger.yml
[node-badge]: https://img.shields.io/node/v/yildiz.svg
[swagger-badge]: https://img.shields.io/badge/Swagger%20UI-OK-orange.svg
