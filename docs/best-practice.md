# Best Practice / Rules

1. Never change from depth to creation mode for edges on an existing database
2. When using creation mode for edges, the relation field must be unique
3. When a node relates to more than 100k edges, it should be a right node that is treated as "isPopularRightNode",
to ensure fast db responses
4. re-occuring unique data cannot be stored on a node, it should be stored on an edge in creation mode
5. high frequency relations, should be stored without data, they should be stored in depth mode that is simply counting
their relation hits