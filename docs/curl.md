# yildiz 5.7.0 HttpServer CURL Examples

[This file is auto-generated via **'yarn curl'**.]

* ->Index request.<-

```shell
    # Request:
    curl 'http://localhost:45456/' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"version":"5.7.0"}
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
    curl 'http://localhost:45456/translator/translate-and-store' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"value":"93c150e1-5886-4fa8-b017-7406cbff1830","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false},"ttld":true}' --compressed

    # 201-Response:
    # {"identifier":2031160443,"value":"93c150e1-5886-4fa8-b017-7406cbff1830","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false},"ttld":true}
```

* ->Get translation information.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/2031160443' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":2031160443,"value":"93c150e1-5886-4fa8-b017-7406cbff1830","data":{"xd":123,"bla":"blup","derp":1.2,"hihi":false},"ttld":true,"created_at":"2018-01-30T15:15:45.000Z"}
```

* ->Create a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"identifier":2031160443,"data":{"bla":"blup"},"ttld":true}' --compressed

    # 201-Response:
    # {"id":4003848189,"identifier":"2031160443","data":{"bla":"blup"},"ttld":true,"created_at":"2018-01-30T15:15:45.468Z"}
```

* ->Get information about node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/2031160443' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"id":4003848189,"identifier":"2031160443","data":{"bla":"blup"},"ttld":true,"created_at":"2018-01-30T15:15:45.000Z"}
```

* ->Create a second node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"identifier":2726446795,"data":{"bla":"blup 2"}}' --compressed

    # 201-Response:
    # {"id":1860314135,"identifier":"2726446795","data":{"bla":"blup 2"},"ttld":false,"created_at":"2018-01-30T15:15:45.478Z"}
```

* ->Check whether an edge exists.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/4003848189/1860314135/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 404-Response:
    # {"error":"Edge with these ids and relation does not exist.","code":404}
```

* ->Create an edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":4003848189,"rightId":1860314135,"relation":"test","attributes":{"taschen":"voller lila"},"_extend":{},"ttld":true}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get existing edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/4003848189/1860314135/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"id":3193443708,"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-01-30T15:15:45.000Z"}
```

* ->Create another edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":4003848189,"rightId":1860314135,"relation":"test","attributes":{"taschen":"voller lila zum quadrat"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Create an edge between two nodes (swapped ids).<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":1860314135,"rightId":4003848189,"relation":"test","attributes":{"taschen":"voller lila zum quadrat swapped"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get all edges with left node id and relation.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/left/4003848189/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"2018-01-30T15:15:45.000Z","right_node_id":1860314135},{"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-01-30T15:15:45.000Z","right_node_id":1860314135}]}
```

* ->Get all edges with right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/right/4003848189/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"2018-01-30T15:15:45.000Z","left_node_id":1860314135}]}
```

* ->Get all edges with left or right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/both/4003848189/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"2018-01-30T15:15:45.000Z","right_node_id":4003848189,"left_node_id":1860314135},{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"2018-01-30T15:15:45.000Z","right_node_id":1860314135,"left_node_id":4003848189},{"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-01-30T15:15:45.000Z","right_node_id":1860314135,"left_node_id":4003848189}]}
```

* ->Complex merged information about edges for translated nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/translated-edge-info' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"values":["93c150e1-5886-4fa8-b017-7406cbff1830","3ba548d2-4420-4809-a2f2-096c0cb2416b"]}' --compressed

    # 200-Response:
    # {"edges":[{"right_node_id":4003848189,"relation":"3127628307","depth":1},{"right_node_id":1860314135,"relation":"3127628307","depth":1},{"right_node_id":1860314135,"relation":"3127628307","depth":1}]}
```

* ->Complex 2 node, 1 edge relation creation (also creates translations) in single request.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/upsert-singular-relation-no-transaction' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftNodeIdentifierVal":"bla-bla-bla","rightNodeIdentifierVal":"blup-blup-blup","leftNodeData":{},"rightNodeData":{},"ttld":true,"relation":"1","edgeData":{},"depthBeforeCreation":true}' --compressed

    # 200-Response:
    # {"leftNodeId":3971369474,"rightNodeId":315919661,"edgeId":135061638,"leftNodeIdentifier":678422669,"rightNodeIdentifier":945641971}
```

* ->Complex 2 node, 1 edge relation creation (also creates translations) in single request.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/upsert-singular-relation' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftNodeIdentifierVal":"bla-bla-bla","rightNodeIdentifierVal":"blup-blup-blup","leftNodeData":{},"rightNodeData":{},"ttld":true,"relation":"1","edgeData":{},"depthBeforeCreation":true}' --compressed

    # 200-Response:
    # {"leftNodeId":3971369474,"rightNodeId":315919661,"edgeId":135061638,"leftNodeIdentifier":678422669,"rightNodeIdentifier":945641971}
```

* ->Get a count for translates.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/count' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"count":4}
```

* ->Get a count for nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/count' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"count":4}
```

* ->Get a count for edges.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/count' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"count":4}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/4003848189/1860314135/test' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

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
    curl 'http://localhost:45456/node/2031160443' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/2031160443' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Statistics for all running prefix yildiz instances in factory.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/stats' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"http":{"request":37,"missing_prefix":2,"auth_good":29,"not_found":1},"avgResponseTime":2.2484024501754902,"factory":{"http_test":{"internCalls":{"queries":40,"raw":6,"depths":1,"translates":9,"nodes":20,"graphs":3,"query":1},"externCalls":{"translate":8,"create_trans":2,"get_trans":1,"create_node":2,"get_node_identifier":1,"edge_exists_id":3,"create_edge_id":3,"get_edges_left":1,"get_edges_right":1,"get_edges_both":1,"edge_info_nodes_translates":1,"upsert_relation":2,"remove_edge_id":1,"remove_node":2,"remove_trans":2},"cache":{"nodes":{"hit":0,"miss":1,"set":1},"edges":{"hit":0,"miss":3,"set":1},"size":0,"deletes":3,"clears":0},"gauges":{"http_test_5_7_0_y_relation_upsert_nt":5,"http_test_5_7_0_y_relation_upsert":2},"ttl":{}}}}
```

* ->Complex 2 node, 1 edge relation creation (also creates translations) in single request.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/upsert-singular-relation' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftNodeIdentifierVal":"RAAAF-l","rightNodeIdentifierVal":"RAAAF-r","leftNodeData":{},"rightNodeData":{},"ttld":false,"relation":"1","edgeData":{},"depthBeforeCreation":true}' --compressed

    # 200-Response:
    # {"leftNodeId":3076707026,"rightNodeId":4274587850,"edgeId":4230702037,"leftNodeIdentifier":3686319182,"rightNodeIdentifier":1241057748}
```

* ->Increase depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/increase' -X PUT -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":3076707026,"rightId":4274587850,"relation":"1"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Decrease depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/decrease' -X PUT -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":3076707026,"rightId":4274587850,"relation":"1"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/3076707026/4274587850/1' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

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
    # # HELP gauge_http_avg_res_time gauge_http_avg_res_time_help
# TYPE gauge_http_avg_res_time gauge
gauge_http_avg_res_time{prefix="stats"} 5.6789535180177495

# HELP internCalls_queries internCalls_queries_help
# TYPE internCalls_queries counter
internCalls_queries{prefix="http_test"} 87

# HELP internCalls_raw internCalls_raw_help
# TYPE internCalls_raw counter
internCalls_raw{prefix="http_test"} 23

# HELP internCalls_depths internCalls_depths_help
# TYPE internCalls_depths counter
internCalls_depths{prefix="http_test"} 1

# HELP internCalls_translates internCalls_translates_help
# TYPE internCalls_translates counter
internCalls_translates{prefix="http_test"} 11

# HELP internCalls_nodes internCalls_nodes_help
# TYPE internCalls_nodes counter
internCalls_nodes{prefix="http_test"} 27

# HELP internCalls_graphs internCalls_graphs_help
# TYPE internCalls_graphs counter
internCalls_graphs{prefix="http_test"} 4

# HELP internCalls_query internCalls_query_help
# TYPE internCalls_query counter
internCalls_query{prefix="http_test"} 25

# HELP externCalls_translate externCalls_translate_help
# TYPE externCalls_translate counter
externCalls_translate{prefix="http_test"} 12

# HELP externCalls_create_trans externCalls_create_trans_help
# TYPE externCalls_create_trans counter
externCalls_create_trans{prefix="http_test"} 3

# HELP externCalls_get_trans externCalls_get_trans_help
# TYPE externCalls_get_trans counter
externCalls_get_trans{prefix="http_test"} 1

# HELP externCalls_create_node externCalls_create_node_help
# TYPE externCalls_create_node counter
externCalls_create_node{prefix="http_test"} 4

# HELP externCalls_get_node_identifier externCalls_get_node_identifier_help
# TYPE externCalls_get_node_identifier counter
externCalls_get_node_identifier{prefix="http_test"} 1

# HELP externCalls_edge_exists_id externCalls_edge_exists_id_help
# TYPE externCalls_edge_exists_id counter
externCalls_edge_exists_id{prefix="http_test"} 5

# HELP externCalls_create_edge_id externCalls_create_edge_id_help
# TYPE externCalls_create_edge_id counter
externCalls_create_edge_id{prefix="http_test"} 4

# HELP externCalls_get_edges_left externCalls_get_edges_left_help
# TYPE externCalls_get_edges_left counter
externCalls_get_edges_left{prefix="http_test"} 1

# HELP externCalls_get_edges_right externCalls_get_edges_right_help
# TYPE externCalls_get_edges_right counter
externCalls_get_edges_right{prefix="http_test"} 1

# HELP externCalls_get_edges_both externCalls_get_edges_both_help
# TYPE externCalls_get_edges_both counter
externCalls_get_edges_both{prefix="http_test"} 1

# HELP externCalls_edge_info_nodes_translates externCalls_edge_info_nodes_translates_help
# TYPE externCalls_edge_info_nodes_translates counter
externCalls_edge_info_nodes_translates{prefix="http_test"} 1

# HELP externCalls_upsert_relation externCalls_upsert_relation_help
# TYPE externCalls_upsert_relation counter
externCalls_upsert_relation{prefix="http_test"} 3

# HELP externCalls_remove_edge_id externCalls_remove_edge_id_help
# TYPE externCalls_remove_edge_id counter
externCalls_remove_edge_id{prefix="http_test"} 1

# HELP externCalls_remove_node externCalls_remove_node_help
# TYPE externCalls_remove_node counter
externCalls_remove_node{prefix="http_test"} 2

# HELP externCalls_remove_trans externCalls_remove_trans_help
# TYPE externCalls_remove_trans counter
externCalls_remove_trans{prefix="http_test"} 2

# HELP cache_nodes_hit cache_nodes_hit_help
# TYPE cache_nodes_hit counter
cache_nodes_hit{prefix="http_test"} 0

# HELP cache_nodes_miss cache_nodes_miss_help
# TYPE cache_nodes_miss counter
cache_nodes_miss{prefix="http_test"} 1

# HELP cache_nodes_set cache_nodes_set_help
# TYPE cache_nodes_set counter
cache_nodes_set{prefix="http_test"} 1

# HELP cache_edges_hit cache_edges_hit_help
# TYPE cache_edges_hit counter
cache_edges_hit{prefix="http_test"} 1

# HELP cache_edges_miss cache_edges_miss_help
# TYPE cache_edges_miss counter
cache_edges_miss{prefix="http_test"} 5

# HELP cache_edges_set cache_edges_set_help
# TYPE cache_edges_set counter
cache_edges_set{prefix="http_test"} 4

# HELP cache_size cache_size_help
# TYPE cache_size counter
cache_size{prefix="http_test"} 1

# HELP cache_deletes cache_deletes_help
# TYPE cache_deletes counter
cache_deletes{prefix="http_test"} 5

# HELP cache_clears cache_clears_help
# TYPE cache_clears counter
cache_clears{prefix="http_test"} 0

# HELP gauge_gauge_http_test_5_7_0_y_relation_upsert_nt gauge_gauge_http_test_5_7_0_y_relation_upsert_nt_help
# TYPE gauge_gauge_http_test_5_7_0_y_relation_upsert_nt gauge
gauge_gauge_http_test_5_7_0_y_relation_upsert_nt{prefix="http_test"} 5

# HELP gauge_gauge_http_test_5_7_0_y_relation_upsert gauge_gauge_http_test_5_7_0_y_relation_upsert_help
# TYPE gauge_gauge_http_test_5_7_0_y_relation_upsert gauge
gauge_gauge_http_test_5_7_0_y_relation_upsert{prefix="http_test"} 8

# HELP ttl_job_runs ttl_job_runs_help
# TYPE ttl_job_runs counter
ttl_job_runs{prefix="http_test"} 7

# HELP ttl_translate_removes ttl_translate_removes_help
# TYPE ttl_translate_removes counter
ttl_translate_removes{prefix="http_test"} 3

# HELP ttl_edge_removes ttl_edge_removes_help
# TYPE ttl_edge_removes counter
ttl_edge_removes{prefix="http_test"} 1

# HELP ttl_node_removes ttl_node_removes_help
# TYPE ttl_node_removes counter
ttl_node_removes{prefix="http_test"} 4

# HELP ttl_total_removes ttl_total_removes_help
# TYPE ttl_total_removes counter
ttl_total_removes{prefix="http_test"} 8

# HELP http_request http_request_help
# TYPE http_request counter
http_request{prefix="stats"} 46

# HELP http_missing_prefix http_missing_prefix_help
# TYPE http_missing_prefix counter
http_missing_prefix{prefix="stats"} 2

# HELP http_auth_good http_auth_good_help
# TYPE http_auth_good counter
http_auth_good{prefix="stats"} 38

# HELP http_not_found http_not_found_help
# TYPE http_not_found counter
http_not_found{prefix="stats"} 1

# HELP externCalls_inc_edge_depth externCalls_inc_edge_depth_help
# TYPE externCalls_inc_edge_depth counter
externCalls_inc_edge_depth{prefix="http_test"} 1

# HELP externCalls_depth_walker_total_walks externCalls_depth_walker_total_walks_help
# TYPE externCalls_depth_walker_total_walks counter
externCalls_depth_walker_total_walks{prefix="http_test"} 1

# HELP externCalls_depth_walker_total_edges externCalls_depth_walker_total_edges_help
# TYPE externCalls_depth_walker_total_edges counter
externCalls_depth_walker_total_edges{prefix="http_test"} 1

# HELP externCalls_dec_edge_depth externCalls_dec_edge_depth_help
# TYPE externCalls_dec_edge_depth counter
externCalls_dec_edge_depth{prefix="http_test"} 1

# HELP gauge_gauge_http_test_5_7_0_y_depth_transfer gauge_gauge_http_test_5_7_0_y_depth_transfer_help
# TYPE gauge_gauge_http_test_5_7_0_y_depth_transfer gauge
gauge_gauge_http_test_5_7_0_y_depth_transfer{prefix="http_test"} 8

# HELP gauge_gauge_depth_walker_runtime gauge_gauge_depth_walker_runtime_help
# TYPE gauge_gauge_depth_walker_runtime gauge
gauge_gauge_depth_walker_runtime{prefix="http_test"} 11

```
