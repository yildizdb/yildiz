# KRAKN 1.15.0 HttpServer CURL Examples

[This file is auto-generated via **'yarn curl'**.]

* ->Index request.<-

```shell
    # Request:
    curl 'http://localhost:45456/' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"version":"1.15.0"}
```

* ->Healthcheck with status information.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/health' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"status":"UP"}
```

* ->Quick healthcheck.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/healthcheck' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    #
```

* ->Store translation information. (value is automatically translated into hash.)<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/translate-and-store' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"value":"f509b0ea-98a3-400d-b0eb-b7eb843030e1","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false}}' --compressed

    # 201-Response:
    # {"identifier":2173332412,"value":"f509b0ea-98a3-400d-b0eb-b7eb843030e1","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false}}
```

* ->Get translation information.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/2173332412' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":2173332412,"value":"f509b0ea-98a3-400d-b0eb-b7eb843030e1","data":{"xd":123,"bla":"blup","derp":1.2,"hihi":false}}
```

* ->Create a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"identifier":2173332412,"data":{"bla":"blup"}}' --compressed

    # 201-Response:
    # {"id":3,"identifier":"2173332412","data":{"bla":"blup"}}
```

* ->Get information about node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/2173332412' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"id":3,"identifier":"2173332412","data":{"bla":"blup"}}
```

* ->Create a second node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"identifier":77525916,"data":{"bla":"blup 2"}}' --compressed

    # 201-Response:
    # {"id":4,"identifier":"77525916","data":{"bla":"blup 2"}}
```

* ->Check whether an edge exists.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/3/4/test' -H 'x-krakn-prefix: http_test' --compressed

    # 404-Response:
    # {"error":"Edge with these ids and relation does not exist.","code":404}
```

* ->Create an edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":3,"rightId":4,"relation":"test","attributes":{"taschen":"voller lila"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get existing edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/3/4/test' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"depth":1,"relation":"3127628307","data":{"taschen":"voller lila"}}
```

* ->Create another edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":3,"rightId":4,"relation":"test","attributes":{"taschen":"voller lila zum quadrat"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Create an edge between two nodes (swapped ids).<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":4,"rightId":3,"relation":"test","attributes":{"taschen":"voller lila zum quadrat swapped"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get all edges with left node id and relation.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/left/3/test' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila"},"ttld":false,"created_at":"","right_node_id":4},{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"","right_node_id":4}]}
```

* ->Get all edges with right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/right/3/test' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"","left_node_id":4}]}
```

* ->Get all edges with left or right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/both/3/test' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila"},"ttld":false,"created_at":"","right_node_id":4,"left_node_id":3},{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"","right_node_id":4,"left_node_id":3},{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"","right_node_id":3,"left_node_id":4}]}
```

* ->Increase depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/increase' -X PUT -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":3,"rightId":4,"relation":3127628307}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Decrease depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/decrease' -X PUT -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":3,"rightId":4,"relation":"test"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Complex merged information about edges for translated nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/translated-edge-info' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"values":["f509b0ea-98a3-400d-b0eb-b7eb843030e1","77525916-5c77-45e6-86b5-8141a8cbf339"]}' --compressed

    # 200-Response:
    # {"edges":[{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila"},"value":"77525916-5c77-45e6-86b5-8141a8cbf339","tdata":{"bla":"blup 2"}},{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila zum quadrat"},"value":"77525916-5c77-45e6-86b5-8141a8cbf339","tdata":{"bla":"blup 2"}},{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila zum quadrat swapped"},"value":"f509b0ea-98a3-400d-b0eb-b7eb843030e1","tdata":{"xd":123,"bla":"blup","derp":1.2,"hihi":false}}]}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/3/4/test' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Executing raw spread (queries with metadata result).<-

```shell
    # Request:
    curl 'http://localhost:45456/raw/spread' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"query":"DELETE FROM http_test_edges WHERE 1 = 1"}' --compressed

    # 200-Response:
    # {"metadata":{"fieldCount":0,"affectedRows":1,"insertId":0,"info":"","serverStatus":34,"warningStatus":0}}
```

* ->Executing raw spread (queries with result set).<-

```shell
    # Request:
    curl 'http://localhost:45456/raw/query' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"query":"SELECT COUNT(*) AS count FROM http_test_edges"}' --compressed

    # 200-Response:
    # {"results":[{"count":0}]}
```

* ->Deleting a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/2173332412' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/2173332412' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```
