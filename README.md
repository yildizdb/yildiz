<center><img src="https://cdn1.teamhellfall.de/contentdelivery/02051803-7e0d-4279-937b-cf5aeb2bed1e.1a6b4e86-4e57-456d-ad8b-cd49a1c30748.png
?dim=172x186" /></center><br/>

# krakn - Graph Database on top of MySQL

high performance relations (Graph) database on top of MySQL

## Features

* multi-tenancy/table-size management through table prefixes
* high read and write performance
* lightweight deployments (small Node.js footprint)
* scales easily
* sits on top of any MySQL database (easy to adapt to Postgres, MSSQL or SQLite3)
* able to handle billions of edges and nodes
* attach **dynamic data** to edges and nodes (as JSON columns)
* extend the existing table schema through `_extend` options

## Build for High Troughput

* Node.js 8.x 1 core + (Percona) MySQL 5.7 1 core => 5600 ops/sec | MySQL @ 40% cpu
* Node.js 9.x 8 cores + (Percona) MySQL 5.7 4 cores => 38200 ops/sec | MySQL @ 360% cpu
* Highly async API based on `fastify`, `sequelize` and an in-memory cache
* Hashing string keys into **integers** representations via `murmurhash3`

## Usage

* Use as application: `npm install -g krakn` and `krakndb -p 3058 -l /path/to/config.json`
* Use right [alongside your code](example/krakn-sample.js)
* Spawn server via [http interface](example/krakn-http.js)

## Available Clients

* [Node.js](https://github.com/krystianity/krakn-js)
* **Any Http Client** can be used to access the HTTP-Interface

## Documentation

* [Http Interface Curl Examples](docs/curl.md)
* [Open API/Swagger JSON](docs/swagger.json)
* [Why develop another graph database?](docs/why.md)
* [How does it work?](docs/how.md)
* [When to use/not use krakn](docs/use-case.md)
* [TODO/Feature list](docs/todo.md)

## Developing krakn

* start database via docker `yarn db:start`
* run tests via `yarn test`
* run tests with SQL debugging via `yarn sql`
* start http-server via `yarn http`
* **generate Open API/Swagger** via `yarn swagger`
* **generate CURL examples** via `yarn curl`
* stop database via `yarn db:stop`



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

- [x] exchange prefix names with new static ones
- [x] change relation to integer
- [ ] rewrite createEdge to raw query (ignore existing id combos)
- [ ] write raw getEdges method
- [ ] add ttls to functions and eps
- [ ] add ttl job + time to config file
- [ ] finish use-case.md
- [ ] add raw query + ep for select and execute
- [ ] add new eps to client
- [ ] add ttl to client
- [ ] add id field to response of edge
- [ ] add ttld and created_at fields to responses
- [ ] regenerate curl and swagger
- [ ] publish to npm repo