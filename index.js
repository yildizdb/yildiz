"use strict";

const {Krakn} = require("./lib/Krakn.js");

const krakn = new Krakn("kn1", {});

(async () => {

    await krakn.init({

        //possible way to extend fields in the node and edge tables
        properties: {
            name: Krakn.TYPES.STRING
        },
        attributes: {
            as: Krakn.TYPES.STRING
        }
    }, true);

    const nodeHandler = await krakn.getNodeHandler();

    const romeo = await nodeHandler.createNode("romeo", {someKey: "someValue"}, {name: "Romeo"});
    const juliet = await nodeHandler.createNode("juliet", {someKey: "someValue"}, {name: "Juliet"});

    const edge1 = await nodeHandler.createEdge(romeo, juliet, "love", {someKey: "someValue"}, {as: "loves"});
    const edge2 = await nodeHandler.createEdge(juliet, romeo, "hate", {someKey: "someValue"}, {as: "hates"});

    const rromeo = await nodeHandler.getNodeByIdentifier("romeo");
    await nodeHandler.getNodeByPropertyField("name", "Romeo");
    console.log(rromeo.getExtend());

    const nodes = (await rromeo.getEdgedNodes()).map(node => [
        node.getKraknID(), node.getIdentifier(), node.getProperties(), node.getExtend()]
    );
    console.log(nodes);

    const nodex = await rromeo.getEdgedNodes();
    console.log(nodex[0].getAttributes(), nodex[0].getEdge());

    krakn.close();
})();