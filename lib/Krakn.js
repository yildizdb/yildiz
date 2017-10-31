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

class Krakn {

    constructor(prefix = "kn", config = {}){

        this.prefix = prefix;
        this.idAsStr = null;
        this.config = config;

        this.sequelize = null;
        this.models = null;
        this.cache = new Cache();
    }

    getNodeHandler(){
        return new Promise(resolve => {
            resolve(new NodeHandler(this));
        });
    }

    getTranslator(){
        return new Promise(resolve => {
            resolve(new Translator(this));
        });
    }

    getGraphAccess(){
        return new Promise(resolve => {
            resolve(new GraphAccess(this));
        })
    }

    async getStats(){
        return {
            cache: await this.cache.getStats()
        };
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
        } = this.config;

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
            logging: sqlStmt => sqlDebug(sqlStmt), //prevent large logs
            storage
        });

        await this.sequelize.authenticate();
        debug("auth test was successfull.");

        this.models = await this._generate(properties, attributes, idAsStr);
        debug("models generated.");

        await this.sequelize.sync({force});
        debug("sync done, ready to do work.");
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
                    type: Sequelize.STRING,
                    defaultValue: "unknown"
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
                    data: {
                        type: Sequelize.JSON
                    },
                    depth: {
                        type: Sequelize.INTEGER,
                        defaultValue: 1
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
                through: Edge //defines Edge as normalized table m:m
            });

            resolve({
                Node,
                Edge,
                Translate
            });
        });
    }

    async close(){

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