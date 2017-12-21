# YildizDB supports Prometheus Metrics

- yildizdb exposes internal statistics via its `/admin/stats` endpoint when run as HTTP server
- additionally it translates the stats in regular intervals (2,5 secs default) to prometheus metrics
    which it exposes under `/admin/metrics`
- you can configure your [Prometheus](https://prometheus.io/) to scrape the metrics from your yilidzdb instances
- and use [Grafana](https://grafana.com/get) for example to illustrate the metrics in real-time graphs
- you can find an example **Grafana Dashboard** [here](grafana.json)