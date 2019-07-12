"use strict";

const assert = require("assert");
const {spawn, spawnSync} = require("child_process");

const dialect = process.env["DIALECT"] || "default";
const config = process.env["LOCAL_CONFIG"] ? 
    require("../../config.GBT.json") 
    : 
    require(`../../config/${dialect}.json`);

let emulatorProcess;
let YildizFactory = null;
if (dialect === "bigtable") {
    YildizFactory = require("./../../index.js").bigtable.YildizFactory;
}
else {
    YildizFactory = require("./../../index.js").rdbms.YildizFactory;
}

describe("Factory INT", () => {

    before("start the BigTable emulator", () => {
        process.env["BIGTABLE_EMULATOR_HOST"] = "127.0.0.1:8086";
        emulatorProcess = spawn("sh", [
            "-c",
            "gcloud beta emulators bigtable start",
        ]);
    });

    before(async() => {
        process.env["STAGE"] = "LOCAL";
    });
    
    after("stop the BigTable emulator", () => {
        if (emulatorProcess) {
            emulatorProcess.kill("SIGINT");
        }
    
        spawnSync("sh", [
            "-c",
            "kill $(ps aux | grep '[c]btemulator' | awk '{print $2}')",
        ]);
    
        delete process.env["BIGTABLE_EMULATOR_HOST"];
    });

    const factory = new YildizFactory(config);
    const prefix = "derp_test";

    it("should be able to get an instance for a prefix", async () => {

        const yildiz = await factory.get(prefix);
        assert.ok(yildiz);

        const stats = await yildiz.getStats();
        assert.ok(stats);
    });

    it("should be able to get an instance from cache", async () => {

        assert.ok(factory.cache.size());
        assert.equal(factory.cache.keys().length, 1);

        const yildiz = await factory.get(prefix);
        assert.ok(yildiz);
    }); 

    it("should remove the tables created", async () => {

        const yildiz = await factory.get(prefix);
        await yildiz.resetTables();

        assert.ok(true);
    }); 

});