# yildiz 6.13.0 HttpServer CURL Examples

[This file is auto-generated via **'yarn curl'**.]

* ->Index request.<-

```shell
    # Request:
    curl 'http://localhost:45456/' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"version":"6.13.0"}
```

* ->Healthcheck with status information.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/health' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"status":"UP"}
```

* ->Quick healthcheck.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/healthcheck' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    #
```

* ->Not described<-

```shell
    # Request:
    curl 'http://localhost:45456/brr/brr' -H 'x-yildiz-prefix: http_test' --compressed

    # 404-Response:
    # "{\"error\":\"Route and method not found.\",\"stack\":null}"
```

* ->Store translation information. (value is automatically translated into hash.)<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/translate-and-store' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"value":"f60dab84-6280-4780-92f8-7114bb26e5bf","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false},"ttld":true}' --compressed

    # 201-Response:
    # {"identifier":3692376640,"value":"f60dab84-6280-4780-92f8-7114bb26e5bf","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false},"ttld":true}
```

* ->Get translation information.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/3692376640' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":3692376640,"value":"f60dab84-6280-4780-92f8-7114bb26e5bf","data":{"xd":123,"bla":"blup","derp":1.2,"hihi":false},"ttld":true,"created_at":"2018-02-06T09:17:15.000Z"}
```

* ->Create a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"identifier":3692376640,"data":{"bla":"blup"},"ttld":true}' --compressed

    # 201-Response:
    # {"id":992855050,"identifier":"3692376640","data":{"bla":"blup"},"ttld":true,"created_at":"2018-02-06T09:17:15.925Z"}
```

* ->Get information about node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/3692376640' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"id":992855050,"identifier":"3692376640","data":{"bla":"blup"},"ttld":true,"created_at":"2018-02-06T09:17:15.000Z"}
```

* ->Create a second node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"identifier":2024246099,"data":{"bla":"blup 2"}}' --compressed

    # 201-Response:
    # {"id":3655881849,"identifier":"2024246099","data":{"bla":"blup 2"},"ttld":false,"created_at":"2018-02-06T09:17:15.937Z"}
```

* ->Check whether an edge exists.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/992855050/3655881849/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 404-Response:
    # {"error":"Edge with these ids and relation does not exist.","code":404}
```

* ->Create an edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":992855050,"rightId":3655881849,"relation":"test","attributes":{"taschen":"voller lila"},"_extend":{},"ttld":true}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get existing edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/992855050/3655881849/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"id":"1386225742","depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-02-06T09:17:15.000Z"}
```

* ->Create another edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":992855050,"rightId":3655881849,"relation":"test","attributes":{"taschen":"voller lila zum quadrat"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Create an edge between two nodes (swapped ids).<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":3655881849,"rightId":992855050,"relation":"test","attributes":{"taschen":"voller lila zum quadrat swapped"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get all edges with left node id and relation.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/left/992855050/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-02-06T09:17:15.000Z","right_node_id":3655881849},{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"2018-02-06T09:17:15.000Z","right_node_id":3655881849}]}
```

* ->Get all edges with right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/right/992855050/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"2018-02-06T09:17:15.000Z","left_node_id":3655881849}]}
```

* ->Get all edges with left or right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/both/992855050/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-02-06T09:17:15.000Z","right_node_id":3655881849,"left_node_id":992855050},{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"2018-02-06T09:17:15.000Z","right_node_id":3655881849,"left_node_id":992855050},{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"2018-02-06T09:17:15.000Z","right_node_id":992855050,"left_node_id":3655881849}]}
```

* ->Complex merged information about edges for translated nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/translated-edge-info' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"values":["f60dab84-6280-4780-92f8-7114bb26e5bf","4c229943-305a-47bf-9e02-c69ea4d456f8"]}' --compressed

    # 200-Response:
    # {"edges":[{"right_node_id":3655881849,"relation":"3127628307","depth":1},{"right_node_id":3655881849,"relation":"3127628307","depth":1},{"right_node_id":992855050,"relation":"3127628307","depth":1}]}
```

* ->Complex 2 node, 1 edge relation creation (also creates translations) in single request.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/upsert-singular-relation-no-transaction' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftNodeIdentifierVal":"bla-bla-bla","rightNodeIdentifierVal":"blup-blup-blup","leftNodeData":{},"rightNodeData":{},"ttld":true,"relation":"1","edgeData":{},"depthBeforeCreation":true}' --compressed

    # 200-Response:
    # {"leftNodeId":3039811118,"rightNodeId":2686569450,"edgeId":2037838660,"leftNodeIdentifier":678422669,"rightNodeIdentifier":945641971}
```

* ->Complex 2 node, 1 edge relation creation (also creates translations) in single request.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/upsert-singular-relation' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftNodeIdentifierVal":"bla-bla-bla","rightNodeIdentifierVal":"blup-blup-blup","leftNodeData":{},"rightNodeData":{},"ttld":true,"relation":"1","edgeData":{},"depthBeforeCreation":true}' --compressed

    # 200-Response:
    # {"leftNodeId":3039811118,"rightNodeId":2686569450,"edgeId":2037838660,"leftNodeIdentifier":678422669,"rightNodeIdentifier":945641971}
```

* ->Get a count for translates.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/counts' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"counts":4}
```

* ->Get a count for nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/counts' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"counts":4}
```

* ->Get a count for edges.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/counts' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"counts":4}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/992855050/3655881849/test' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Executing raw spread (queries with metadata result).<-

```shell
    # Request:
    curl 'http://localhost:45456/raw/spread' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"query":"DELETE FROM http_test_edges WHERE 1 = 1"}' --compressed

    # 200-Response:
    # {"metadata":{"fieldCount":0,"affectedRows":2,"insertId":0,"info":"","serverStatus":34,"warningStatus":0}}
```

* ->Executing raw spread (queries with result set).<-

```shell
    # Request:
    curl 'http://localhost:45456/raw/query' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"query":"SELECT COUNT(*) AS count FROM http_test_edges"}' --compressed

    # 200-Response:
    # {"results":[{"count":0}]}
```

* ->Deleting a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/3692376640' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/3692376640' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Get a count for translates.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/counts' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"counts":0}
```

* ->Get a count for edges.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/counts' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"counts":0}
```

* ->Get a count for nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/counts' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"counts":0}
```

* ->Complex 2 node, 1 edge relation creation (also creates translations) in single request.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/upsert-singular-relation' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftNodeIdentifierVal":"RAAAF-l","rightNodeIdentifierVal":"RAAAF-r","leftNodeData":{},"rightNodeData":{},"ttld":false,"relation":"1","edgeData":{},"depthBeforeCreation":true}' --compressed

    # 200-Response:
    # {"leftNodeId":3624435479,"rightNodeId":4293837480,"edgeId":3435164804,"leftNodeIdentifier":3686319182,"rightNodeIdentifier":1241057748}
```

* ->Increase depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/increase' -X PUT -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":3624435479,"rightId":4293837480,"relation":"1"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Decrease depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/decrease' -X PUT -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":3624435479,"rightId":4293837480,"relation":"1"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/3624435479/4293837480/1' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/3686319182' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/3686319182' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/1241057748' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Get Prometheus Metrics.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/metrics' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # # HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.176203 1517908640893

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total 0.006806 1517908640893

# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 0.183009 1517908640893

# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
# TYPE process_start_time_seconds gauge
process_start_time_seconds 1517908635

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 103297024 1517908640896

# HELP process_virtual_memory_bytes Virtual memory size in bytes.
# TYPE process_virtual_memory_bytes gauge
process_virtual_memory_bytes 1278459904 1517908640896

# HELP process_heap_bytes Process heap size in bytes.
# TYPE process_heap_bytes gauge
process_heap_bytes 159002624 1517908640896

# HELP process_open_fds Number of open file descriptors.
# TYPE process_open_fds gauge
process_open_fds 17 1517908640895

# HELP process_max_fds Maximum number of open file descriptors.
# TYPE process_max_fds gauge
process_max_fds 1590301

# HELP nodejs_eventloop_lag_seconds Lag of event loop in seconds.
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0.001187164 1517908640895

# HELP nodejs_active_handles_total Number of active handles.
# TYPE nodejs_active_handles_total gauge
nodejs_active_handles_total 12 1517908640894

# HELP nodejs_active_requests_total Number of active requests.
# TYPE nodejs_active_requests_total gauge
nodejs_active_requests_total 2 1517908640894

# HELP nodejs_heap_size_total_bytes Process heap size from node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 72749056 1517908640894

# HELP nodejs_heap_size_used_bytes Process heap size used from node.js in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 39624600 1517908640894

# HELP nodejs_external_memory_bytes Nodejs external memory size in bytes.
# TYPE nodejs_external_memory_bytes gauge
nodejs_external_memory_bytes 108339 1517908640894

# HELP nodejs_heap_space_size_total_bytes Process heap space size total from node.js in bytes.
# TYPE nodejs_heap_space_size_total_bytes gauge
nodejs_heap_space_size_total_bytes{space="new"} 33554432 1517908640894
nodejs_heap_space_size_total_bytes{space="old"} 32305152 1517908640894
nodejs_heap_space_size_total_bytes{space="code"} 2097152 1517908640894
nodejs_heap_space_size_total_bytes{space="map"} 2641920 1517908640894
nodejs_heap_space_size_total_bytes{space="large_object"} 2150400 1517908640894

# HELP nodejs_heap_space_size_used_bytes Process heap space size used from node.js in bytes.
# TYPE nodejs_heap_space_size_used_bytes gauge
nodejs_heap_space_size_used_bytes{space="new"} 5084352 1517908640894
nodejs_heap_space_size_used_bytes{space="old"} 28849152 1517908640894
nodejs_heap_space_size_used_bytes{space="code"} 1513920 1517908640894
nodejs_heap_space_size_used_bytes{space="map"} 2052160 1517908640894
nodejs_heap_space_size_used_bytes{space="large_object"} 2127952 1517908640894

# HELP nodejs_heap_space_size_available_bytes Process heap space size available from node.js in bytes.
# TYPE nodejs_heap_space_size_available_bytes gauge
nodejs_heap_space_size_available_bytes{space="new"} 11414336 1517908640894
nodejs_heap_space_size_available_bytes{space="old"} 2713280 1517908640894
nodejs_heap_space_size_available_bytes{space="code"} 301888 1517908640894
nodejs_heap_space_size_available_bytes{space="map"} 56888 1517908640894
nodejs_heap_space_size_available_bytes{space="large_object"} 1426705920 1517908640894

# HELP nodejs_version_info Node.js version info.
# TYPE nodejs_version_info gauge
nodejs_version_info{version="v9.2.0",major="9",minor="2",patch="0"} 1

```
