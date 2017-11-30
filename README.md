# krakn - HTTP Hyper Relations on MySQL

high performance relations (Graph) database on top of MySQL

## Features

* multi-tenancy/table-size management through table prefixes
* high read and write performance
* lightweight deployments (small Node.js footprint) + scales easily
* sits on top of any MySQL database (easy to adapt to Postgres, MSSQL or SQLite3)
* able to handle billions of edges and nodes
* ttl feature for all resources
* attach **dynamic data** to edges and nodes (as JSON columns)
* extend the existing table schema through `_extend` options

## Build for High Throughput

* Node.js 8.x 1 core + (Percona) MySQL 5.7 1 core => 5600 ops/sec | MySQL @ 40% cpu
* Node.js 9.x 8 cores + (Percona) MySQL 5.7 4 cores => 38200 ops/sec | MySQL @ 360% cpu
* Highly async API based on `fastify`, `sequelize` and an in-memory cache
* Hashing string keys into **integer** representations via `murmurhash3`

## Usage

* Use as application: `npm install -g krakn` and `krakndb -p 3058 -l /path/to/config.json`
* Use right [alongside your code](example/krakn-sample.js)
* Spawn server via [http interface](example/krakn-http.js)

## Easy Setup with Docker & Docker-Compose

* if you have docker and docker-compose installed you can setup krakn locally super easy:
* `git clone https://github.com/krakndb/krakn`
* `cd krakn`
* `docker-compose up --build`
* this will start a MySQL Database, Adminer Admin UI @ `http://localhost:8080` and krakn @ `http://localhost:3058`
* it will pull its config from `config/docker.json`

## Available Clients

* [Node.js](https://github.com/krystianity/krakn-js)
* **Any Http Client** can be used to access the HTTP-Interface

## Documentation

* [Http Interface Curl Examples](docs/curl.md)
* [Open API/Swagger JSON](docs/swagger.json)
* [Why develop another graph database?](docs/why.md)
* [How does it work?](docs/how.md)
* [Krakn Use Cases](docs/use-case.md)

## Developing krakn

* start database via docker `yarn db:start`
* run tests via `yarn test`
* run tests with SQL debugging via `yarn sql`
* start http-server via `yarn http`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`
* stop database via `yarn db:stop`

## Misc

* kraken exposes Prometheus Metrics @ `/admin/metrics`
* kraken exposes JSON stats @ `/admin/stats`

## In Development

* [ ] implement dijkstra for MySQL 8
* [ ] security concept for prefixes

```
MMMMMMMMMMMMMNdyo+/:::::::/+sdMMMMMMMMMMMMMMMMMMMM
MMMMMMMMMMMd+-----------------:sNMMMMMMMMMMMMMMMMM
MMMMMMMMMN+---------------------:mMMMMMMMMMMMMMMMM
MMMMMMMMN:-----------------------:NMMMMMMMMMMMMMMM
MMMMMMMMo-------------------------oMMMMMMMMMMMMMMM
MMMMMMMM:---------:-----------..--:NMMMMMMMMMMMMMM
MMMMMMMM/--------.----------:ss:---dMMMMMMMMMMMMMM
MMMMMMMMy-------::dh+:------oNmy---sMMMMMMMMMMMMMM
MMMMMMMMMo-------/mNd:::::::/yh/----yMMMMMMMMMMMMM
MMMMMMMMMMo-------/o/-----------::--/MMMMMMMMMMMMM
MMMMMMMMMMN------:---:------::------oMMMMMMMMMMMMM
MMMMMMNMMMMs----------:+o/+s/------+NMMMMMMMMMMMMM
MMMMMM/odMMMy:----------:::------/hMMMMMMddMMMMMMM
MMMMMM+--:+ydmhs+---------------omNMNmy+:/NMMMMMMM
MMMMMMs---::::::-----------------::----:sNMMMMMMmm
MMMMMMN+::-------------------------:::odmmdhys+:/N
MMMMMMmo-----:--------------------------------.:NM
mhhhs/-----::----:-----------------:-------.`.sMMM
N/---------:-----/-----/-------:-------..-:+hNMMMM
MN+..---.`------/------+-------:-------+ydmNMMMMMM
MMMms+/+/-------------:o:-------.------------:+sdM
MMMMMMmo-------`------/d:-----::``----------.:ohNM
MMNhs:-------..om:---:hN------hMh:```..``./ymMMMMM
MMNmhso+///+sdMMMh---oMM/----oMMMMNysoshmMMMMMMMMM
MMMMMMMMMMMMMMMMMMs-/NMMy---+MMMMMMMMMMMMMMMMMMMMM
MMMMMMMMMMMMMMMMMMM+hMMMM+-:NMMMMMMMMMMMMMMMMMMMMM
MMMMMMMMMMMMMMMMMMMNMMMMMNohMMMMMMMMMMMMMMMMMMMMMM
```