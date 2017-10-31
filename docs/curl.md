# KRAKN 0.14.0 HttpServer CURL Examples

[This file is auto-generated via **'yarn curl'**.]

* ->Index request.<-

```shell
    # Request:
    curl 'http://localhost:45456/' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"version":"0.14.0"}
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
    curl 'http://localhost:45456/translator/translate-and-store' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"value":"685946f0-972d-47b9-90ef-315442300aad","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false}}' --compressed

    # 201-Response:
    # {"identifier":3978838496,"value":"685946f0-972d-47b9-90ef-315442300aad","data":{"bla":"blup","xd":123,"derp":1.2,"hihi":false}}
```

* ->Get translation information.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/3978838496' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":3978838496,"value":"685946f0-972d-47b9-90ef-315442300aad","data":{"xd":123,"bla":"blup","derp":1.2,"hihi":false}}
```

* ->Create a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"identifier":3978838496,"data":{"bla":"blup"}}' --compressed

    # 201-Response:
    # {"identifier":"3978838496","id":109,"data":{"bla":"blup"}}
```

* ->Get information about node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/3978838496' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"identifier":"3978838496","id":109,"data":{"bla":"blup"}}
```

* ->Create a second node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"identifier":101406049,"data":{"bla":"blup 2"}}' --compressed

    # 201-Response:
    # {"identifier":"101406049","id":110,"data":{"bla":"blup 2"}}
```

* ->Check whether an edge exists.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/109/110/test' -H 'x-krakn-prefix: http_test' --compressed

    # 404-Response:
    # {"error":"Edge with these ids and relation does not exist.","code":404}
```

* ->Create an edge between two nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":109,"rightId":110,"relation":"test","attributes":{"taschen":"voller lila"},"_extend":{}}' --compressed

    # 201-Response:
    # {"depth":1,"relation":"test","data":{"taschen":"voller lila"}}
```

* ->Get existing edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/109/110/test' -H 'x-krakn-prefix: http_test' --compressed

    # 200-Response:
    # {"depth":1,"relation":"test","data":{"taschen":"voller lila"}}
```

* ->Increase depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/increase' -X PUT -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":109,"rightId":110,"relation":"test"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Decrease depth of an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/depth/decrease' -X PUT -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"leftId":109,"rightId":110,"relation":"test"}' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Complex merged information about edges for translated nodes.<-

```shell
    # Request:
    curl 'http://localhost:45456/access/translated-edge-info' -H 'content-type: application/json' -H 'x-krakn-prefix: http_test' --data-binary '{"values":["685946f0-972d-47b9-90ef-315442300aad","bcf3a1cf-a429-41a8-b027-993c13443db8"]}' --compressed

    # 200-Response:
    # {"edges":[{"other_node_id":110,"relation":"test","depth":1,"edata":{},"value":"bcf3a1cf-a429-41a8-b027-993c13443db8","tdata":{}}]}
```

* ->Deleting an edge.<-

```shell
    # Request:
    curl 'http://localhost:45456/edge/109/110/test' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a node.<-

```shell
    # Request:
    curl 'http://localhost:45456/node/3978838496' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```

* ->Deleting a translation.<-

```shell
    # Request:
    curl 'http://localhost:45456/translator/3978838496' -X DELETE -H 'x-krakn-prefix: http_test' -H 'content-length: 0' --compressed

    # 200-Response:
    # {"success":true}
```
