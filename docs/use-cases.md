# Use cases for Yildiz Graph Database

## YildizDB might suite very well if

* you want to store event relations of streams (e.g. from Apache Kafka)
* you have to handle a high amount of concurrent writes (and simulatinous reads)
* you need a leightweight event-relation / graph solution
* you need a graph event-relation that can deal with tons of concurent edge attribute updates
* you are looking for simple accessability with YildizDB's HTTP API
* you need a TTL feature for nodes and edges on cell (event) level
* you are focussed on non nested $N:N$ relationships in your Graph

## You should not use YildizDB if

* you are looking for a fully fledged Graph Database solution
* you are trying to solve (shortest) path problems
* you are trying to store highly nested deep graphs
* you need commercial support