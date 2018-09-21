#!/usr/bin/env node

const program = require("commander");
const pjson = require("./../package.json");

program
    .version(pjson.version)
    .usage("[options] <file ..>")
    .option("-p, --port <n>", "HttpServer port (optional)")
    .option("-l, --logs", "Log to stdout (optional)")
    .option("-j, --json", "Parses log output as JSON (optional)")
    .parse(process.argv);

let debugBase = null;
if(program.json){

    process.env.DEBUG_HIDE_DATE = "true";
    process.env.DEBUG_COLORS = "false";
    
    debugBase = require("debug"); //overwrite
    const oldDebug = debugBase.log;
    debugBase.log = (arg1, arg2, arg3) => {
        try {
            if(arg1 && typeof arg1 !== "string"){
                arg1 = JSON.stringify(arg1);
            }
        
            if(arg1 && typeof arg2 !== "string"){
                arg2 = JSON.stringify(arg2);
            }
        
            if(arg1 && typeof arg3 !== "string"){
                arg3 = JSON.stringify(arg3);
            }
    
            const msgs = [arg1, arg2, arg3];
            
            oldDebug(JSON.stringify({
                msg: msgs.filter(m => !!m).join(" ")
            }));
        } catch(error){
            oldDebug("Dropped log message because of error " + error.message);
        }
    }
} else {
    debugBase = require("debug"); //overwrite
}

//require here because of potential debug usage
const Promise = require("bluebird");
const path = require("path");
const fs = require("fs");
const debug = debugBase("yildiz:bin");

const { HttpServer } = require("./../index.js");

let port = 3058;
if(program.port){
    port = program.port;
}

if(program.logs){
    debugBase.enable("yildiz:*");
} else {
    debugBase.enable("yildiz:bin");
}

const defaultOptions = require("./../config/bigtable.json");

if(!program.args || !program.args.length){
    debug("No config JSON file path passed, exiting.");
    return process.exit(1);
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
    return process.exit(2);
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

        case "REDIS_SINGLE_HOST":
            options.redis.single.host = iter.val;
        break;

        case "REDIS_SINGLE_PORT":
            options.redis.single.port = iter.val;
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
