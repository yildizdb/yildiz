#!/usr/bin/env node

const program = require("commander");
const path = require("path");
const fs = require("fs");
const debugBase = require("debug");
const debug = debugBase("krakn:bin");

const { HttpServer } = require("./../index.js");
const pjson = require("./../package.json");

program
    .version(pjson.version)
    .usage("[options] <file ..>")
    .option("-p, --port <n>", "HttpServer port (optional)")
    .option("-l, --logs", "Log to stdout (optional)")
    .parse(process.argv);

debug(`Initialising krakndb-${pjson.version}.`);

let port = 3058;
if(program.port){
    port = program.port;
}

if(program.logs){
    debugBase.enable("krakn:*");
} else {
    debugBase.enable("krakn:bin");
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

options = Object.assign(defaultOptions, options);
debug("Starting http interface..");
const server = new HttpServer(port, options);
server.listen().then(() => {
    fs.readFile(path.join(__dirname, "./banner.txt"), "utf8", (error, banner) => {
        if(error || !banner){
            debug("failed to display banner :(.");
        } else {
            console.log(banner);
        }
        debug(`http interface running @ ${port}.`);
    });
}, error => {
    debug(`exception during start-up: ${error.message}.`);
    process.exit(3);
});