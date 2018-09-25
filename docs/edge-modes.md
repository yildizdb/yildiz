# There are two modes to handle edge relations in YildizDB

## Depth-Increase Mode

1. Counts the amount of edges for the two nodes, if they exceed 1 it will throw an error
2. Identifies the edge of the two node, if existing and increases its depth column count by 1
3. If the edge was not existing, it will create a new edge with a depth value of 1

## Creation Mode

1. It will simply create a new edge with the new values

## Return value of the method

- When successfull, the method will always return the ids of both nodes, as well as the one of the edge
    it doesnt matter if they were created or just gathered as existing ids
- It will also return the two used identifiers for the nodes, just in case they might be needed
