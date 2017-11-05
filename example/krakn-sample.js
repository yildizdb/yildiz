"use strict";

const {Krakn} = require("./../index.js");

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
    const translator = await krakn.getTranslator();

    const loveRelationValue = "love";
    const hateRelationValue = "hate";
    const otherRelationValue = "other";
    const loveRelation = translator.strToInt(loveRelationValue);
    const hateRelation = translator.strToInt(hateRelationValue);
    const otherRelation = translator.strToInt(otherRelationValue);
    const julietIdentifier = translator.strToInt("juliet");

    const romeoIdentifier = translator.strToInt("romeo");
    await translator.storeTranslation(romeoIdentifier, "romeo", {someKey: "someValue0"});
    const transRes = await translator.getTranslation(romeoIdentifier);
    console.log(transRes);

    const romeo = await nodeHandler.createNode(romeoIdentifier, {someKey: "someValue1"}, {name: "Romeo"});
    const juliet = await nodeHandler.createNode(julietIdentifier, {someKey: "someValue2"}, {name: "Juliet"});

    const edge1 = await nodeHandler.createEdge(romeo, juliet, loveRelation, {someKey: "someValue3"}, {as: "loves"});
    const edge2 = await nodeHandler.createEdge(juliet, romeo, hateRelation, {someKey: "someValue4"}, {as: "hates"});
    const edge3 = await nodeHandler.createEdge(romeo, juliet, loveRelation, {someKey: "someValue5"}, {as: "loves"});


    console.log(edge1, edge2, edge3);

    const rromeo = await nodeHandler.getNodeByIdentifier(romeoIdentifier);
    await nodeHandler.getNodeByPropertyField("name", "Romeo");
    console.log(rromeo.getExtend());

    const nodes = (await rromeo.getEdgedNodes()).map(node => [
        node.getKraknID(), node.getIdentifier(), node.getProperties(), node.getExtend()]
    );
    console.log(nodes);

    const nodex = await rromeo.getEdgedNodes();
    console.log(nodex[0].getAttributes(), nodex[0].getEdge());

    const redge1 = await nodeHandler.edgeExistsId(romeo.getKraknID(), juliet.getKraknID(), loveRelation);
    const redge2 = await nodeHandler.edgeExists(julietIdentifier, romeoIdentifier, hateRelation);
    console.log(redge1, redge2);

    const redge3 = await nodeHandler.edgeExistsViaJoin(julietIdentifier, romeoIdentifier, hateRelation);
    console.log(redge3);

    const incRes = await nodeHandler.increaseEdgeDepthById(romeo.getKraknID(), juliet.getKraknID(), loveRelation);
    console.log(incRes);

    const decRes = await nodeHandler.decreaseEdgeDepthById(romeo.getKraknID(), juliet.getKraknID(), loveRelation);
    console.log(decRes);

    const updRes = await nodeHandler.updateEdgeByIds(romeo.getKraknID(), juliet.getKraknID(), loveRelation,
        {}, {}, otherRelation);
    console.log(updRes);

    //const delRes = await nodeHandler.removeEdgeByIds(romeo.getKraknID(), juliet.getKraknID(), otherRelation);
    //console.log(delRes);

    krakn.close();
})();