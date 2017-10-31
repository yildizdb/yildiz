# KRAKN 0.12.0 HttpServer CURL Examples

[This file is auto-generated via **'yarn curl'**.]

* ->Index request.<-

```shell
    # Request:
    curl 'http://localhost:45456/' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"version":"0.12.0"}
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
    curl 'http://localhost:45456/translator/translate-and-store' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"value":"fe88445a-9087-4b5a-bbc7-e17e962ec989","data":{"bla":"blup"}}' --compressed

    # 201-Response:
    # {"identifier":2608752470,"value":"fe88445a-9087-4b5a-bbc7-e17e962ec989","data":{}}
```

* ->Get translation information.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/2608752470' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":2608752470,"value":"fe88445a-9087-4b5a-bbc7-e17e962ec989","data":{}}
```

* ->Create a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"identifier":2608752470,"data":{"bla":"blup"}}' --compressed

    # 201-Response:
    # {"identifier":"2608752470","id":77,"data":{}}
```

* ->Get information about node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/2608752470' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":"2608752470","id":77,"data":{}}
```

* ->Create a second node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"identifier":3478450573,"data":{"bla":"blup 2"}}' --compressed

    # 201-Response:
    # {"identifier":"3478450573","id":78,"data":{}}
```

* ->Check whether an edge exists.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/77/78/test' -H 'x-krakn-prefix: http_test' --compressed

    # 404-Response:
    # {"error":"Edge with these ids and relation does not exist.","code":404}
```

* ->Create an edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":77,"rightId":78,"relation":"test","attributes":{"taschen":"voller lila"},"_extend":{}}' --compressed

    # 201-Response:
    # {"depth":1,"relation":"test","data":{}}
```

* ->Get existing edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/77/78/test' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"depth":1,"relation":"test","data":{}}
```

* ->Increase depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/increase' -X PUT -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":77,"rightId":78,"relation":"test"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Decrease depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/decrease' -X PUT -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":77,"rightId":78,"relation":"test"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Complex merged information about edges for translated nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/translated-edge-info' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"values":["fe88445a-9087-4b5a-bbc7-e17e962ec989","f5d5962c-aae0-4df5-a340-718083ebd55d"]}' --compressed

    # 200-Response:
    # {"edges":[{"other_node_id":78,"relation":"test","depth":1,"edata":{},"value":"f5d5962c-aae0-4df5-a340-718083ebd55d","tdata":{}}]}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/77/78/test' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/2608752470' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/2608752470' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```
