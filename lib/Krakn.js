"use strict";

const Promise = require("bluebird");
const Sequelize = require("sequelize");
const Debug = require("debug");
const debug = Debug("krakn:main");
const sqlDebug = Debug("sql:debug");

const NodeHandler = require("./NodeHandler.js");

class Krakn {

    constructor(prefix = "kn", config = {}){

        this.prefix = prefix;
        this.config = config;

        this.sequelize = null;
        this.models = null;
    }

    getNodeHandler(){
        return new Promise((resolve, reject) => {
            resolve(new NodeHandler(this));
        });
    }

    async init(options = {}, force = false){

        const {
            properties, //types for nodes
            attributes //types for attributes
        } = options;

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
                max: 5,
                min: 0,
                idle: 5000
            },
            logging: sqlStmt => sqlDebug(sqlStmt), //prevent large logs
            storage
        });

        await this.sequelize.authenticate();
        debug("auth test was successfull.");

        this.models = await this.generate(properties, attributes);
        debug("models generated.");

        await this.sequelize.sync({force});
        debug("sync done, ready to do work.");
    }

    generate(properties = {}, attributes = {}){
        return new Promise((resolve, reject) => {

            //double object.assign here, because the first ones
            //are also added as indexed columns

            properties = Object.assign(properties, {
                identifier: {
                    type: Sequelize.STRING
                }
            });

            attributes = Object.assign(attributes, {
                relation: {
                    type: Sequelize.STRING
                }
            });

            const Node = this.sequelize.define(`${this.prefix}_node`, 
                Object.assign({}, properties, {
                    id: { //always overwrite with id field
                        type: Sequelize.UUID,
                        primaryKey: true
                    },
                    data: {
                        type: Sequelize.JSON
                    }
                }), {
                    indexes: Object.keys(properties).map(key => ({fields:[key], unique: false}))
                });

            const Edge = this.sequelize.define(`${this.prefix}_edge`, 
                Object.assign({}, attributes, {
                    id: { //enforces a custom primary key for the edge table
                        type: Sequelize.UUID,
                        primaryKey: true
                    },
                    data: {
                        type: Sequelize.JSON
                    }
                }),{
                    indexes: Object.keys(attributes).map(key => ({fields:[key], unique: false}))
                });

            Node.belongsToMany(Node, {
                as: {singular: "otherNode", plural: "otherNodes"}, //names functions
                through: Edge //defines Edge as normalisation table m:m
            });

            //node.addOtherNode(node, { through: { some: 'bla' }}); //-> creates new Edge

            resolve({
                Node,
                Edge
            });
        });
    }

    close(){

        if(this.sequelize){
            return this.sequelize.close();
        }
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