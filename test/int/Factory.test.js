"use strict";

const assert = require("assert");

const {KraknFactory} = require("./../../index.js");

describe("Factory INT", () => {

    const factory = new KraknFactory();
    const prefix = "derp_test";

    it("should be able to get an instance for a prefix", async () => {

        const krakn = await factory.get(prefix);
        assert.ok(krakn);

        const stats = await krakn.getStats();
        assert.ok(stats);
    });

    it("should be able to get an instance from cache", async () => {

        assert.ok(factory._cache.size());
        assert.equal(factory._cache.keys().length, 1);

        const krakn = await factory.get(prefix);
        assert.ok(krakn);
    }); 
});