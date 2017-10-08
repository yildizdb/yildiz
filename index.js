"use strict";

const {Krakn} = require("./lib/Krakn.js");

const krakn = new Krakn({});

(async () => {

    await krakn.init({
        prefix: "kn1",
        properties: {
            name: Krakn.TYPES.STRING
        },
        attributes: {
            as: Krakn.TYPES.STRING
        }
    });

    const nodeHandler = await krakn.getNodeHandler();

    const romeo = await nodeHandler.createNode({name: "Romeo"});
    const juliet = await nodeHandler.createNode({name: "Juliet"});

    const edge1 = await nodeHandler.createEdge(romeo, juliet, {as: "loves"});
    const edge2 = await nodeHandler.createEdge(juliet, romeo, {as: "hates"});

    const rromeo = await nodeHandler.getNodeByPropertyField("name", "Romeo");
    console.log(rromeo.getProperties());

    const nodes = (await rromeo.getEdgedNodes()).map(node => node.getProperties().id);
    console.log(nodes);

    krakn.close();
})();