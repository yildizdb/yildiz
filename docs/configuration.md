# Configuration of YildizDB

## Scaling

YildizDB is build to scale horizontally, just put it behind a load balancer
like NGINX and increase the amount of upstreams to your liking or load.
There is no additional configuration as the instances centralise through the
configured backends (Bigtable and Memorystore / Redis).

## Backends

### Bigtable

* Checkout the example config [here](../config/bigtable.json)
* Please **note**: This setup requires Redis (or Memorystore)

## Deployments

### As container

* Super easy via package manager checkout this [Dockerfile](../Dockerfile)

### In Kubernetes

* Kubernetes HELM [charts](https://github.com/yildizdb/charts)