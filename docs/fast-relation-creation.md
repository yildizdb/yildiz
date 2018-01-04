# Fast Relation Creation

- YildizDB offers a faster way to ensure that a single-handed relation ship, shown as edge between two nodes
    is created in the database
- it will also create two translations for the created nodes (if necessary)
- you can use the `GraphAccess.upsertSingleEdgeRelationBetweenNodes({})` directly or use the 
- HTTP endpoint `POST: /access/upsert-singular-relation` (there is an example [here](/access/upsert-singular-relation))
- usually it would take up to 7 method calls to create this kind of relation, but with this method Yildiz runs all
    of the operations straight in a single stored procedure MySQL transaction

## What happens when you call this method/endpoint:

1. Yildiz turns the passed values into identifiers
2. Yildiz then checks if both nodes exists
3. If any node does not exist, it will be created
4. As well as a translation row for the corresponding identifier/value combination
5. It then selects the ids of the created nodes
6. Depending on the passed mode, it will treat edge creation

## There are two modes to handle edge relations in YildizDB

### Depth-Increase Mode

1. Counts the amount of edges for the two nodes, if they exceed 1 it will throw an error
2. Identifies the edge of the two node, if existing and increases its depth column count by 1
3. If the edge was not existing, it will create a new edge with a depth value of 1

### Creation Mode

1. It will simply create a new edge with the new values

## Return value of the method

- When successfull, the method will always return the ids of both nodes, as well as the one of the edge
    it doesnt matter if they were created or just gathered as existing ids
- It will also return the two used identifiers for the nodes, just in case they might be needed