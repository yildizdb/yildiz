# yildiz 1.19.0 HttpServer CURL Examples

[This file is auto-generated via **'yarn curl'**.]

* ->Index request.<-

```shell
    # Request:
    curl 'http://localhost:45456/' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"version":"1.19.0"}
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

* ->Store translation information. (value is automatically translated into hash.)<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/translate-and-store' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"value":"63c4e87f-d62a-4c06-b103-375f0574cc4a","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false},"ttld":true}' --compressed

    # 201-Response:
    # {"identifier":63,"value":"63c4e87f-d62a-4c06-b103-375f0574cc4a","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false},"ttld":true}
```

* ->Get translation information.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/63' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":63,"value":"63c4e87f-d62a-4c06-b103-375f0574cc4a","data":{"xd":123,"bla":"blup","derp":1.2,"hihi":false},"ttld":true,"created_at":"2017-12-04T23:35:50.000Z"}
```

* ->Create a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"identifier":63,"data":{"bla":"blup"},"ttld":true}' --compressed

    # 201-Response:
    # {"id":13,"identifier":"63","data":{"bla":"blup"},"ttld":true,"created_at":"2017-12-04T23:35:50.000Z"}
```

* ->Get information about node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/63' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"id":13,"identifier":"63","data":{"bla":"blup"},"ttld":true,"created_at":"2017-12-04T23:35:50.000Z"}
```

* ->Create a second node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"identifier":903613654,"data":{"bla":"blup 2"}}' --compressed

    # 201-Response:
    # {"id":14,"identifier":"903613654","data":{"bla":"blup 2"},"ttld":false,"created_at":"2017-12-04T23:35:50.000Z"}
```

* ->Check whether an edge exists.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/13/14/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 404-Response:
    # {"error":"Edge with these ids and relation does not exist.","code":404}
```

* ->Create an edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":13,"rightId":14,"relation":"test","attributes":{"taschen":"voller lila"},"_extend":{},"ttld":true}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get existing edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/13/14/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"id":13,"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2017-12-04T23:35:50.000Z"}
```

* ->Create another edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":13,"rightId":14,"relation":"test","attributes":{"taschen":"voller lila zum quadrat"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Create an edge between two nodes (swapped ids).<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":14,"rightId":13,"relation":"test","attributes":{"taschen":"voller lila zum quadrat swapped"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get all edges with left node id and relation.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/left/13/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2017-12-04T23:35:50.000Z","right_node_id":14},{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"2017-12-04T23:35:50.000Z","right_node_id":14}]}
```

* ->Get all edges with right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/right/13/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"2017-12-04T23:35:50.000Z","left_node_id":14}]}
```

* ->Get all edges with left or right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/both/13/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2017-12-04T23:35:50.000Z","right_node_id":14,"left_node_id":13},{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"2017-12-04T23:35:50.000Z","right_node_id":14,"left_node_id":13},{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"2017-12-04T23:35:50.000Z","right_node_id":13,"left_node_id":14}]}
```

* ->Increase depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/increase' -X PUT -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":13,"rightId":14,"relation":3127628307}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Decrease depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/decrease' -X PUT -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":13,"rightId":14,"relation":"test"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Complex merged information about edges for translated nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/translated-edge-info' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"values":["63c4e87f-d62a-4c06-b103-375f0574cc4a","d61bb335-a15a-49c9-b1de-67bd91004376"]}' --compressed

    # 200-Response:
    # {"edges":[{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila"},"value":"d61bb335-a15a-49c9-b1de-67bd91004376","tdata":{"bla":"blup 2"}},{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila zum quadrat"},"value":"d61bb335-a15a-49c9-b1de-67bd91004376","tdata":{"bla":"blup 2"}},{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila zum quadrat swapped"},"value":"63c4e87f-d62a-4c06-b103-375f0574cc4a","tdata":{"xd":123,"bla":"blup","derp":1.2,"hihi":false}}]}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/13/14/test' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Executing raw spread (queries with metadata result).<-

```shell
    # Request:
    curl 'http://localhost:45456/raw/spread' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"query":"DELETE FROM http_test_edges WHERE 1 = 1"}' --compressed

    # 200-Response:
    # {"metadata":{"fieldCount":0,"affectedRows":1,"insertId":0,"info":"","serverStatus":34,"warningStatus":0}}
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
    curl 'http://localhost:45456/node/63' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/63' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Statistics for all running prefix yildiz instances in factory.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/stats' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"http_test":{"internCalls":{"queries":34,"translates":6,"nodes":20,"graphs":1,"query":1,"raw":1},"externCalls":{"translate":2,"create_trans":2,"get_trans":1,"create_node":2,"get_node_identifier":1,"edge_exists_id":5,"create_edge_id":3,"get_edges_left":1,"get_edges_right":1,"get_edges_both":1,"inc_edge_depth":1,"dec_edge_depth":1,"edge_info_nodes_translates":1,"remove_edge_id":1,"remove_node":2,"remove_trans":2},"cache":{"nodes":{"hit":0,"miss":1,"set":1},"edges":{"hit":0,"miss":5,"set":3},"size":0,"deletes":5,"clears":0}}}
```

* ->Get Prometheus Metrics.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/metrics' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # # HELP metric_name metric_help
# TYPE metric_name counter
metric_name 0

```
