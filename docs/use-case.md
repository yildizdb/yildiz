# Use cases for krakn

## Krakn might suite very well if

* you want to store event relations of streams
* you have to handle a high amount of concurrent events
* you have a general large write throughput
* you need a leightweight graph solution
* you are prototyping different graph schemes
* you need a graph solution that can deal with tons of concurent edge attribute updates
* you are looking for simple accessability with krakn's HTTP API
* you need a TTL feature for nodes and edges

## You should not use krakn if

* you are trying to store more than 10 Terabytes of data (per model)
* you are looking for a fully fledged graph solution
* you need commercial support