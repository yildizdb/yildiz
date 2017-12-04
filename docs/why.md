# Why develop another "graph" database

TL;DR: easy setup, simple scaling, maintainability, heavy write throughput, http API, ttl feature

## In detail

* graph databases like **neo4j** have do not give access to their scaling features in the community versions
* graph databases like **janusgraph** have require complicated setups
* graph databases like **orientDB** or **grakn** do not perform well under heavy write throughput, especially
    when creating thousands of edges per second
* graph databases like **titan** or **FlockDB** are not maintained anymore
* most existing graph databases miss "exists" features that result in the execution of
    multiple queries
* yildiz does not re-invent the wheel too much, as it just sits on top of MySQL as http or application-layer.
* graph databases like **neo4j** do not have a ttl feature, nodes and edges cannot expire automatically