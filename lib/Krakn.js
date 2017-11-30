"use strict";

const Promise = require("bluebird");
const Sequelize = require("sequelize");
const Debug = require("debug");
const debug = Debug("krakn:main");
const sqlDebug = Debug("sql:debug");

const NodeHandler = require("./graph/NodeHandler.js");
const Cache = require("./graph/Cache.js");
const Translator = require("./graph/Translator.js");
const GraphAccess = require("./graph/GraphAccess.js");

const Dijkstra = require("./graph/Dijkstra.js");
const Lifetime = require("./db/Lifetime.js");

class Krakn {

    constructor(prefix = "kn", config = {}){

        this.prefix = prefix;
        this.idAsStr = null;
        this.config = config;

        if(!this.config.database){
            this.config.database = {};
        }

        if(!this.config.cache){
            this.config.cache = {};
        }

        this.sequelize = null;
        this.models = null;
        this.cache = new Cache(this.config.cache);
        this.dijkstra = new Dijkstra(this);

        this.stats = {};
        this.exstats = {};
        
        if(this.config.ttl && typeof this.config.ttl === "object"){
            this.ttlJob = new Lifetime(this, this.config.ttl);
        } else {
            debug("ttl job configuration missing.");
        }
    }

    getNodeHandler(){
        this._incStat("nodes");
        return new Promise(resolve => {
            resolve(new NodeHandler(this));
        });
    }

    getTranslator(){
        this._incStat("translates");
        return new Promise(resolve => {
            resolve(new Translator(this));
        });
    }

    getGraphAccess(){
        this._incStat("graphs");
        return new Promise(resolve => {
            resolve(new GraphAccess(this));
        });
    }

    async getStats(){

        const stats = {
            internCalls: this.stats,
            externCalls: this.exstats,
            cache: await this.cache.getStats()
        };
        
        return stats;
    }

    async init(options = {}, force = false){

        const {
            properties, //types for nodes
            attributes, //types for attributes
            idAsStr
        } = options;

        this.idAsStr = idAsStr;

        let {
            database,
            username,
            password,
            host,
            port,
            dialect,
            pool,
            storage
        } = this.config.database;

        database = database || "krakn";
        username = username || "root";
        password = password || "toor";

        debug("init", database, "as", username);
        this.sequelize = new Sequelize(database, username, password, {
            host: host || "localhost",
            port,
            dialect: dialect || "mysql",
            pool: pool || {
                max: 20,
                min: 0,
                idle: 15000
            },
            logging: sqlStmt => {
                this._incStat("queries");
                sqlDebug(sqlStmt); //arg1 to prevent large logs
            }, 
            storage
        });

        await this.sequelize.authenticate();
        debug("auth test was successfull.");

        this.models = await this._generate(properties, attributes, idAsStr);
        debug("models generated.");

        await this.sequelize.sync({force});
        debug("sync done, ready to do work.");

        //TODO enable for MySQL 8
        //await this.dijkstra.createProcedureVersion1(this.prefix);
        //debug("dijkstra procedure updated.");
    }

    _incStat(key){
        //int
        if(!this.stats[key]){
            this.stats[key] = 1;
        } else {
            this.stats[key] += 1;
        }
    }

    incStat(key){
        //ext
        if(!this.exstats[key]){
            this.exstats[key] = 1;
        } else {
            this.exstats[key] += 1;
        }
    }

    _generate(properties = {}, attributes = {}, idAsStr = false){
        return new Promise((resolve, reject) => {

            //double object.assign here, because the first ones
            //are also added as indexed columns

            properties = Object.assign(properties, {
                identifier: idAsStr ? ({
                    type: Sequelize.STRING,
                    defaultValue: "none"
                }) : 
                ({
                    type: Sequelize.BIGINT,
                    defaultValue: 0
                })
            });

            attributes = Object.assign(attributes, {
                relation: {
                    type: Sequelize.BIGINT,
                    defaultValue: 0
                }
            });

            const Node = this.sequelize.define(`${this.prefix}_node`, 
                Object.assign({}, properties, {
                    id: { //always overwrite with id field
                        type: Sequelize.BIGINT,
                        primaryKey: true,
                        autoIncrement: true
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
                }), {
                    indexes: Object.keys(properties).map(key => ({fields:[key], unique: false})),
                    timestamps: false,
                    paranoid: false,
                    version: false,
                    underscored: true
                });

            const Edge = this.sequelize.define(`${this.prefix}_edge`, 
                Object.assign({}, attributes, {
                    id: {
                        type: Sequelize.BIGINT,
                        primaryKey: true,
                        autoIncrement: true
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
                }),{
                    indexes: Object.keys(attributes).map(key => ({fields:[key], unique: false})),
                    timestamps: false,
                    paranoid: false,
                    version: false,
                    underscored: true
                });

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
                },{
                indexes: [
                    {
                        fields: ["value"],
                        unique: false
                    }
                ],
                timestamps: false,
                paranoid: false,
                version: false,
                underscored: true
            });

            Node.belongsToMany(Node, {
                as: {singular: "other_node", plural: "other_nodes"}, //names functions
                through: {
                    model: Edge,
                    unique: false //defines Edge as normalized table m:m
                },
                foreignKey: "left_node_id",
                otherKey: "right_node_id"
            });

            resolve({
                Node,
                Edge,
                Translate
            });
        });
    }

    async raw(query, replacements){
        this._incStat("raw");
        return await this.sequelize.query(query, {
            replacements,
            type: this.sequelize.QueryTypes.SELECT
        });
    }

    async spread(query, replacements){
        this._incStat("query");
        return await new Promise(resolve => {
            this.sequelize.query(query, {
                replacements
            }).spread((_, metadata) => {
                resolve(metadata);
            });
        });
    }

    async close(){

        if(this.ttlJob){
            this.ttlJob.close();
        }

        if(this.cache){
            this.cache.clear();
        }

        if(this.sequelize){
            await this.sequelize.close();
            return true;
        }

        return false;
    }
}

Krakn.TYPES = {
    STRING: Sequelize.STRING,
    TEXT: Sequelize.TEXT,
    INTEGER: Sequelize.INTEGER,
    BIGINT: Sequelize.BIGINT,
    FLOAT: Sequelize.FLOAT,
    REAL: Sequelize.REAL,
    DOUBLE: Sequelize.DOUBLE,
    DECIMAL: Sequelize.DECIMAL,
    DATE: Sequelize.DATE,
    DATEONLY: Sequelize.DATEONLY,
    BOOLEAN: Sequelize.BOOLEAN,
    ENUM: Sequelize.ENUM,
    ARRAY: Sequelize.ARRAY,
    JSON: Sequelize.JSON,
    JSONB: Sequelize.JSONB,
    BLOB: Sequelize.BLOB,
    UUID: Sequelize.UUID,
    RANGE: Sequelize.RANGE,
    GEOMETRY: Sequelize.GEOMETRY
};

module.exports = {
    Krakn
};