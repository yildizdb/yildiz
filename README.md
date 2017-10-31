# krakn

high performance relations (Graph) database on top of MySQL

## Features

* multi-tenancy through table prefixes
* stable performance
* TODO

## Usage

* Use right [alongside your code](example/krakn-sample.js)
* Deploy as server and use via [http interface](example/krakn-http.js)

## Why

* TODO

## Documentation

[Http Interface Curl Examples](docs/curl.md)
[Open API/Swagger JSON](docs/swagger.json)

## Developing krakn

* start database via docker `yarn db:start`
* run tests via `yarn test`
* run tests with SQL debugging via `yarn sql`
* start http-server via `yarn http`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`
* stop database via `yarn db:stop`