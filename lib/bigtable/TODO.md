# GBT Todo List

- copy HttpTest as BigTable.test.js and remove all the stuff thats not needed and change so that its green
- check if metadata is implemented everywhere (is surely missing on create edge)
- check if metadata is working
- remove all _incStats and whatever inc or stats stuff
- add cache for exist checks
- check if you can reduce the amount of data we pull with row(node).get() for exists checks (we only need to know if it exists, we just need like 1 qualifier and not all edges for example)
- remove translator stuff form the bigtable test (also create dummy Translator class that always resolves null), 
        always return 400 if using translate endpoints if bigtable is active
- add http endpoints for metadata count methods
- pull the metrics class and stats shit into the rdbms subfolder so that each backend can have its own stats and metrics
- add new custom metrics class to bigtable as instance (bigtable/metrics/Metrics.js)
- remove singleTable mode from config (but leave left and right node in config)
- isPopularRightNode for graph access and edge creation (check second http endpoint)