"use strict";

const assert = require("assert");

const {YildizFactory} = require("./../../index.js");
const config = process.env["DIALECT"] === "postgres" ? require("../../config/psql.json") : require("../../config/default.json");

describe("Factory INT", () => {

    const factory = new YildizFactory(config);
    const prefix = "derp_test";

    it("should be able to get an instance for a prefix", async () => {

        const yildiz = await factory.get(prefix);
        assert.ok(yildiz);

        const stats = await yildiz.getStats();
        assert.ok(stats);
    });

    it("should be able to get an instance from cache", async () => {

        assert.ok(factory._cache.size());
        assert.equal(factory._cache.keys().length, 1);

        const yildiz = await factory.get(prefix);
        assert.ok(yildiz);
    }); 
});