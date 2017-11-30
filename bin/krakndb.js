#!/usr/bin/env node

const Promise = require("bluebird");
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
                console.log("r3l453 7h3 kr4k3n!");
                //forbid console
            }
            resolve();
        });
    });
};

debug(`krakndb in version`, pjson.version);
options = Object.assign(defaultOptions, options);
if(process.env["KRAKN_DATABASE_USERNAME"]){
    options.database.username = process.env["KRAKN_DATABASE_USERNAME"];
}
if(process.env["KRAKN_DATABASE_PASSWORD"]){
    options.database.password = process.env["KRAKN_DATABASE_PASSWORD"];
}

debug("Starting http interface..");
const server = new HttpServer(port, options);
server.listen().then(() => {
    debug(`http interface running @ ${port}.`);
    readAndDisplayBanner().then(() => {
        debug(`krakn is ready to accept connections.`);
    });
}, error => {
    debug(`exception during start-up: ${error.message}.`);
    process.exit(3);
});
