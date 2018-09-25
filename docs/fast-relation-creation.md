# Fast Relation Creation

- YildizDB offers a faster way to ensure that a single-handed relation ship, shown as edge between two nodes is created in the database
- you can use the `GraphAccess.upsertSingleEdgeRelationBetweenNodes({})` directly or use the 
- HTTP endpoint `POST: /access/upsert-singular-relation`
- usually it would take up to 7 method calls to create this kind of relation, but with this method YildizDB runs all of the operations straight in a single (retried) operation

## What happens when you call this method/endpoint:

1. Yildiz turns the passed values into identifiers
2. Yildiz then checks if both nodes exists
3. If any node does not exist, it will be created
4. It will determine if an edge must be created and do so
5. Depending on the passed mode, it will treat edge creation

## Access endpoints HTTP resource

Working with the `/access/**` HTTP endpoints makes your life easier
when working with $N:N$ non nested relationships.