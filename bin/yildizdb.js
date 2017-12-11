#!/usr/bin/env node

const Promise = require("bluebird");
const program = require("commander");
const path = require("path");
const fs = require("fs");
const debugBase = require("debug");
const debug = debugBase("yildiz:bin");

const { HttpServer } = require("./../index.js");
const pjson = require("./../package.json");

program
    .version(pjson.version)
    .usage("[options] <file ..>")
    .option("-p, --port <n>", "HttpServer port (optional)")
    .option("-l, --logs", "Log to stdout (optional)")
    .parse(process.argv);

let port = 3058;
if(program.port){
    port = program.port;
}

if(program.logs){
    debugBase.enable("yildiz:*");
} else {
    debugBase.enable("yildiz:bin");
}

const defaultOptions = require("./../config/default.json");

if(!program.args || !program.args.length){
    debug("No config JSON file path passed, exiting.");
    process.exit(1);
}

let uri = program.args[0];
if(!path.isAbsolute(uri)){
    uri = path.join(__dirname, uri);
}

debug(`loading conf: ${uri}.`);
let options = {};

try {
    options = require(uri);
    if(!options || typeof options !== "object"){
        throw new Error("config content is not a JSON object.");
    }
} catch(error){
    debug(`failed to load JSON config file ${error.message}.`);
    process.exit(2);
}

const readAndDisplayBanner = () => {

    if(options.noBanner === true){
        debug("skipping banner.");
        return Promise.resolve();
    }

    return new Promise((resolve, _) => {
        fs.readFile(path.join(__dirname, "./banner.txt"), "utf8", (error, banner) => {
            if(error || !banner){
                debug("failed to display banner :(.");
            } else {
                //allow console
                console.log(banner);
                console.log("l37 7h3 574r5 5h1n3 1n 7h3 5ky!");
                //forbid console
            }
            resolve();
        });
    });
};

debug(`yildizdb in version`, pjson.version);
options = Object.assign(defaultOptions, options);

//overwrite secrets via env variables (easier for kubernetes setups)

const PREFIX = "YILDIZDB_";
const ACK_PREFIX = "ACK_";
Object.keys(process.env)
.filter(key => key.startsWith(PREFIX))
.map(key => { return {key: key.split(PREFIX)[1], val: process.env[key]}; })
.forEach(iter => {

    // turn YILDIZDB_ACK_MYPREFIX=123 into access: { myprefix: "123" }
    if(iter.key.startsWith(ACK_PREFIX)){

        const key = iter.key.split(ACK_PREFIX)[1].toLowerCase();

        if(!options.access || typeof options.access !== "object"){
            options.access = {};
        }

        if(!options.access[key]){
            options.access[key] = [iter.val];
            debug("created access key for prefix", key);
        } else {
            options.access[key].push(iter.val);
            debug("added token to access key for prefix", key);
        }

        return;
    }

    switch(iter.key){

        case "DATABASE_USERNAME":
            options.database.username = iter.val;
        break;

        case "DATABASE_PASSWORD":
            options.database.password = iter.val;
        break;

        default:
            debug("unknown env key", PREFIX + iter.key);
        return;
    }

    debug("env var used for config overwrite", iter.key);
});

// turn ["*"] into "*"
if(options.access && typeof options.access === "object"){
    Object.keys(options.access).forEach(key => {
        let wildcardPresent = false;
        options.access[key].forEach(val => {
            if(val === "*"){
                wildcardPresent = true;
            }
        });
        if(wildcardPresent){
            options.access[key] = "*";
            debug("wildcard found for access key for prefix", key);
        }
    });
}

//start http server

debug("Starting http interface..");
const server = new HttpServer(port, options);
server.listen().then(() => {
    debug(`http interface running @ ${port}.`);
    readAndDisplayBanner().then(() => {
        debug(`yildiz is ready to accept connections.`);
    });
}, error => {
    debug(`exception during start-up: ${error.message}.`);
    process.exit(3);
});
