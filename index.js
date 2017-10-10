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

    const romeo = await nodeHandler.createNode("romeo", {someKey: "someValue1"}, {name: "Romeo"});
    const juliet = await nodeHandler.createNode("juliet", {someKey: "someValue2"}, {name: "Juliet"});

    const edge1 = await nodeHandler.createEdge(romeo, juliet, "love", {someKey: "someValue3"}, {as: "loves"});
    const edge2 = await nodeHandler.createEdge(juliet, romeo, "hate", {someKey: "someValue4"}, {as: "hates"});

    const rromeo = await nodeHandler.getNodeByIdentifier("romeo");
    await nodeHandler.getNodeByPropertyField("name", "Romeo");
    console.log(rromeo.getExtend());

    const nodes = (await rromeo.getEdgedNodes()).map(node => [
        node.getKraknID(), node.getIdentifier(), node.getProperties(), node.getExtend()]
    );
    console.log(nodes);

    const nodex = await rromeo.getEdgedNodes();
    console.log(nodex[0].getAttributes(), nodex[0].getEdge());

    const redge1 = await nodeHandler.edgeExistsId(romeo.getKraknID(), juliet.getKraknID(), "%love%");
    const redge2 = await nodeHandler.edgeExists("juliet", "romeo", "hate");

    console.log(redge1, redge2);

    krakn.close();
})();