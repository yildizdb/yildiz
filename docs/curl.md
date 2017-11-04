# KRAKN 0.15.0 HttpServer CURL Examples

[This file is auto-generated via **'yarn curl'**.]

* ->Index request.<-

```shell
    # Request:
    curl 'http://localhost:45456/' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"version":"0.15.0"}
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
    curl 'http://localhost:45456/translator/translate-and-store' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"value":"72f75719-6df5-44cc-a925-c46630718f41","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false}}' --compressed

    # 201-Response:
    # {"identifier":2653703943,"value":"72f75719-6df5-44cc-a925-c46630718f41","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false}}
```

* ->Get translation information.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/2653703943' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":2653703943,"value":"72f75719-6df5-44cc-a925-c46630718f41","data":{"xd":123,"bla":"blup","derp":1.2,"hihi":false}}
```

* ->Create a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"identifier":2653703943,"data":{"bla":"blup"}}' --compressed

    # 201-Response:
    # {"identifier":"2653703943","id":147,"data":{"bla":"blup"}}
```

* ->Get information about node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/2653703943' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":"2653703943","id":147,"data":{"bla":"blup"}}
```

* ->Create a second node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"identifier":3615208461,"data":{"bla":"blup 2"}}' --compressed

    # 201-Response:
    # {"identifier":"3615208461","id":148,"data":{"bla":"blup 2"}}
```

* ->Check whether an edge exists.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/147/148/test' -H 'x-krakn-prefix: http_test' --compressed

    # 404-Response:
    # {"error":"Edge with these ids and relation does not exist.","code":404}
```

* ->Create an edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":147,"rightId":148,"relation":"test","attributes":{"taschen":"voller lila"},"_extend":{}}' --compressed

    # 201-Response:
    # {"depth":1,"relation":"test","data":{"taschen":"voller lila"}}
```

* ->Get existing edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/147/148/test' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"depth":1,"relation":"test","data":{"taschen":"voller lila"}}
```

* ->Increase depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/increase' -X PUT -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":147,"rightId":148,"relation":"test"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Decrease depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/decrease' -X PUT -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":147,"rightId":148,"relation":"test"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Complex merged information about edges for translated nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/translated-edge-info' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"values":["72f75719-6df5-44cc-a925-c46630718f41","635d4f1c-d902-418e-bbd3-a336e55a729b"]}' --compressed

    # 200-Response:
    # {"edges":[{"other_node_id":148,"relation":"test","depth":1,"edata":{"taschen":"voller lila"},"value":"635d4f1c-d902-418e-bbd3-a336e55a729b","tdata":{"bla":"blup 2"}}]}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/147/148/test' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/2653703943' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/2653703943' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```
