# How does yildiz work?

* in its core yildiz creates four tables for every prefix it is accessed with
* which consists of: "nodes, translations, edges and depths"
* the relation between two nodes can be shown with an edge [Wikipedia Graph Database](https://en.wikipedia.org/wiki/Graph_database)
* it is possible to attach data to nodes (properties) and to edges (attributes)
* in yildiz this data is directly attached to the same row (node or edge) there is no separated table
* an edge can also be described throuh the "relation" or "depth" columns, meaning you can have multiple
    edges between the same nodes with different description, one suggestion would be to use relation
    similar to the "identifier" field and storing translated strings in the BIGINT column and using 
    "depth" similar to a weight field in classic graph db applications
* yildiz tries to keep indexed columns only typed as INTEGER or BIGINT, these reason for that is performance,
    index size and ultimately table (disk) size
* this means that you will have to "translate" (its actually murmur version 3 hashing) your strings
    such as identifiers for nodes or relations of edges to integer representatives
* this is the reason why there is a third table called "translations", which helps you to store the
    unhashed representations of your identifiers and relations
* all three tables have the option to store additional values in JSON colum called "data" which is by default   NULL
* the depth table enables a batched way of increasing the depth values (like edge weight) of edges

Here is a shortened overview of the table generation in sequelize:

```javascript
const Node = this.sequelize.define(`${this.prefix}_node`, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        identifier: {
            type: Sequelize.BIGINT,
            defaultValue: 0
        },
        data: {
            type: Sequelize.JSON
        },
        ttld: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        created_at: {
            type: Sequelize.DATE, 
            defaultValue: Sequelize.NOW
        }
    }, {/* .. */});

const Edge = this.sequelize.define(`${this.prefix}_edge`, {
        id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
        relation: {
            type: Sequelize.BIGINT,
            defaultValue: 0
        },
        data: {
            type: Sequelize.JSON
        },
        depth: {
            type: Sequelize.INTEGER,
            defaultValue: 1
        },
        ttld: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        created_at: {
            type: Sequelize.DATE, 
            defaultValue: Sequelize.NOW
        }
    },{/* .. */});

const Translate = this.sequelize.define(`${this.prefix}_translate`, {
        identifier: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: false
        },
        value: {
            type: Sequelize.STRING,
            defaultValue: "unknown"
        },
        data: {
            type: Sequelize.JSON
        },
        ttld: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        },
        created_at: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        }
    },{/* .. */});

const Depth = this.sequelize.define(`${this.prefix}_depth`, {
    edge_id: {
        type: Sequelize.BIGINT
    },
    created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    }
}, {/* .. */});

Node.belongsToMany(Node, {
    as: {singular: "other_node", plural: "other_nodes"},
    through: {
        model: Edge,
        unique: false
    },
    foreignKey: "left_node_id",
    otherKey: "right_node_id"
});

Edge.hasMany(Depth, {
    foreignKey: "edge_id",
    sourceKey: "id"
});

Depth.belongsTo(Edge, {
    foreignKey: "edge_id", 
    targetKey: "id"
});
```