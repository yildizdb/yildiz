# yildiz 3.1.0 HttpServer CURL Examples

[This file is auto-generated via **'yarn curl'**.]

* ->Index request.<-

```shell
    # Request:
    curl 'http://localhost:45456/' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"version":"3.1.0"}
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
    curl 'http://localhost:45456/translator/translate-and-store' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"value":"0c430265-f4df-45d4-a78f-0195663be695","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false},"ttld":true}' --compressed

    # 201-Response:
    # {"identifier":4080112899,"value":"0c430265-f4df-45d4-a78f-0195663be695","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false},"ttld":true}
```

* ->Get translation information.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/4080112899' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":4080112899,"value":"0c430265-f4df-45d4-a78f-0195663be695","data":{"xd":123,"bla":"blup","derp":1.2,"hihi":false},"ttld":true,"created_at":"2018-01-15T15:01:00.000Z"}
```

* ->Create a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"identifier":4080112899,"data":{"bla":"blup"},"ttld":true}' --compressed

    # 201-Response:
    # {"id":1374055644,"identifier":"4080112899","data":{"bla":"blup"},"ttld":true,"created_at":"2018-01-15T15:01:00.000Z"}
```

* ->Get information about node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/4080112899' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"id":1374055644,"identifier":"4080112899","data":{"bla":"blup"},"ttld":true,"created_at":"2018-01-15T15:01:00.000Z"}
```

* ->Create a second node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"identifier":1962203821,"data":{"bla":"blup 2"}}' --compressed

    # 201-Response:
    # {"id":2875232043,"identifier":"1962203821","data":{"bla":"blup 2"},"ttld":false,"created_at":"2018-01-15T15:01:00.000Z"}
```

* ->Check whether an edge exists.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/1374055644/2875232043/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 404-Response:
    # {"error":"Edge with these ids and relation does not exist.","code":404}
```

* ->Create an edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":1374055644,"rightId":2875232043,"relation":"test","attributes":{"taschen":"voller lila"},"_extend":{},"ttld":true}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get existing edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/1374055644/2875232043/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"id":2563127657,"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-01-15T15:01:00.000Z"}
```

* ->Create another edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":1374055644,"rightId":2875232043,"relation":"test","attributes":{"taschen":"voller lila zum quadrat"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Create an edge between two nodes (swapped ids).<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":2875232043,"rightId":1374055644,"relation":"test","attributes":{"taschen":"voller lila zum quadrat swapped"},"_extend":{}}' --compressed

    # 201-Response:
    # {"success":true}
```

* ->Get all edges with left node id and relation.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/left/1374055644/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"2018-01-15T15:01:00.000Z","right_node_id":2875232043},{"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-01-15T15:01:00.000Z","right_node_id":2875232043}]}
```

* ->Get all edges with right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/right/1374055644/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"2018-01-15T15:01:00.000Z","left_node_id":2875232043}]}
```

* ->Get all edges with left or right node id and relation<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/both/1374055644/test' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"edges":[{"depth":1,"data":{"taschen":"voller lila zum quadrat"},"ttld":false,"created_at":"2018-01-15T15:01:00.000Z","right_node_id":2875232043,"left_node_id":1374055644},{"depth":1,"data":{"taschen":"voller lila zum quadrat swapped"},"ttld":false,"created_at":"2018-01-15T15:01:00.000Z","right_node_id":1374055644,"left_node_id":2875232043},{"depth":1,"data":{"taschen":"voller lila"},"ttld":true,"created_at":"2018-01-15T15:01:00.000Z","right_node_id":2875232043,"left_node_id":1374055644}]}
```

* ->Complex merged information about edges for translated nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/translated-edge-info' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"values":["0c430265-f4df-45d4-a78f-0195663be695","1002f195-2db8-4d84-b755-fab3dcbe016e"]}' --compressed

    # 200-Response:
    # {"edges":[{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila zum quadrat"},"value":"1002f195-2db8-4d84-b755-fab3dcbe016e","tdata":{"bla":"blup 2"}},{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila zum quadrat swapped"},"value":"0c430265-f4df-45d4-a78f-0195663be695","tdata":{"xd":123,"bla":"blup","derp":1.2,"hihi":false}},{"relation":"3127628307","depth":1,"edata":{"taschen":"voller lila"},"value":"1002f195-2db8-4d84-b755-fab3dcbe016e","tdata":{"bla":"blup 2"}}]}
```

* ->Complex 2 node, 1 edge relation creation (also creates translations) in single request.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/upsert-singular-relation-no-transaction' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftNodeIdentifierVal":"bla-bla-bla","rightNodeIdentifierVal":"blup-blup-blup","leftNodeData":{},"rightNodeData":{},"ttld":true,"relation":"1","edgeData":{},"depthBeforeCreation":true}' --compressed

    # 200-Response:
    # {"leftNodeId":396045399,"rightNodeId":3847440365,"edgeId":2450294816,"leftNodeIdentifier":678422669,"rightNodeIdentifier":945641971}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/1374055644/2875232043/test' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

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
    curl 'http://localhost:45456/node/4080112899' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/4080112899' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Statistics for all running prefix yildiz instances in factory.<-

```shell
    # Request:
    curl 'http://localhost:45456/admin/stats' -H 'x-yildiz-prefix: http_test' --compressed

    # 200-Response:
    # {"http":{"request":30,"missing_prefix":1,"bad_prefix":1,"auth_good":24},"avgResponseTime":2.762364014983177,"factory":{"http_test":{"internCalls":{"queries":36,"raw":5,"depths":1,"translates":7,"nodes":17,"graphs":2,"query":1},"externCalls":{"translate":5,"create_trans":2,"get_trans":1,"create_node":2,"get_node_identifier":1,"edge_exists_id":3,"create_edge_id":3,"get_edges_left":1,"get_edges_right":1,"get_edges_both":1,"edge_info_nodes_translates":1,"upsert_relation":1,"remove_edge_id":1,"remove_node":2,"remove_trans":2},"cache":{"nodes":{"hit":0,"miss":1,"set":1},"edges":{"hit":0,"miss":3,"set":1},"size":0,"deletes":3,"clears":0},"ttl":{}}}}
```

* ->Complex 2 node, 1 edge relation creation (also creates translations) in single request.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/upsert-singular-relation' -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftNodeIdentifierVal":"RAAAF-l","rightNodeIdentifierVal":"RAAAF-r","leftNodeData":{},"rightNodeData":{},"ttld":false,"relation":"1","edgeData":{},"depthBeforeCreation":true}' --compressed

    # 200-Response:
    # {"leftNodeId":3315954130,"rightNodeId":2513444202,"edgeId":793617809,"leftNodeIdentifier":3686319182,"rightNodeIdentifier":1241057748}
```

* ->Increase depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/increase' -X PUT -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":3315954130,"rightId":2513444202,"relation":"1"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Decrease depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/decrease' -X PUT -H 'content-type: application/json' -H 'x-yildiz-prefix: http_test' --data-binary '{"leftId":3315954130,"rightId":2513444202,"relation":"1"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/3315954130/2513444202/1' -X DELETE -H 'x-yildiz-prefix: http_test' -H 'content-length: 0' --compressed

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
gauge_http_avg_res_time{prefix="stats"} 2.880627308608382

# HELP internCalls_queries internCalls_queries_help
# TYPE internCalls_queries counter
internCalls_queries{prefix="http_test"} 83

# HELP internCalls_raw internCalls_raw_help
# TYPE internCalls_raw counter
internCalls_raw{prefix="http_test"} 22

# HELP internCalls_depths internCalls_depths_help
# TYPE internCalls_depths counter
internCalls_depths{prefix="http_test"} 1

# HELP internCalls_translates internCalls_translates_help
# TYPE internCalls_translates counter
internCalls_translates{prefix="http_test"} 9

# HELP internCalls_nodes internCalls_nodes_help
# TYPE internCalls_nodes counter
internCalls_nodes{prefix="http_test"} 24

# HELP internCalls_graphs internCalls_graphs_help
# TYPE internCalls_graphs counter
internCalls_graphs{prefix="http_test"} 3

# HELP internCalls_query internCalls_query_help
# TYPE internCalls_query counter
internCalls_query{prefix="http_test"} 25

# HELP externCalls_translate externCalls_translate_help
# TYPE externCalls_translate counter
externCalls_translate{prefix="http_test"} 9

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
externCalls_upsert_relation{prefix="http_test"} 2

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
cache_size{prefix="http_test"} 0

# HELP cache_deletes cache_deletes_help
# TYPE cache_deletes counter
cache_deletes{prefix="http_test"} 5

# HELP cache_clears cache_clears_help
# TYPE cache_clears counter
cache_clears{prefix="http_test"} 0

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
http_request{prefix="stats"} 39

# HELP http_missing_prefix http_missing_prefix_help
# TYPE http_missing_prefix counter
http_missing_prefix{prefix="stats"} 1

# HELP http_bad_prefix http_bad_prefix_help
# TYPE http_bad_prefix counter
http_bad_prefix{prefix="stats"} 1

# HELP http_auth_good http_auth_good_help
# TYPE http_auth_good counter
http_auth_good{prefix="stats"} 33

# HELP externCalls_inc_edge_depth externCalls_inc_edge_depth_help
# TYPE externCalls_inc_edge_depth counter
externCalls_inc_edge_depth{prefix="http_test"} 1

# HELP externCalls_dec_edge_depth externCalls_dec_edge_depth_help
# TYPE externCalls_dec_edge_depth counter
externCalls_dec_edge_depth{prefix="http_test"} 1

```
