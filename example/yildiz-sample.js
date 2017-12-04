"use strict";

const {Yildiz} = require("./../index.js");

const yildiz = new Yildiz("kn1", {});

(async () => {

    await yildiz.init({

        //possible way to extend fields in the node and edge tables
        properties: {
            name: Yildiz.TYPES.STRING
        },
        attributes: {
            as: Yildiz.TYPES.STRING
        }
    }, true);

    const nodeHandler = await yildiz.getNodeHandler();
    const translator = await yildiz.getTranslator();

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

    const edge1 = await nodeHandler.createEdgeWithId(romeo.getYildizID(), juliet.getYildizID(), loveRelation, {someKey: "someValue3"}, {as: "loves"});
    const edge2 = await nodeHandler.createEdgeWithId(juliet.getYildizID(), romeo.getYildizID(), hateRelation, {someKey: "someValue4"}, {as: "hates"});
    const edge3 = await nodeHandler.createEdgeWithId(romeo.getYildizID(), juliet.getYildizID(), loveRelation, {someKey: "someValue5"}, {as: "loves"});
    console.log(edge1, edge2, edge3);

    const rromeo = await nodeHandler.getNodeByIdentifier(romeoIdentifier);
    await nodeHandler.getNodeByPropertyField("name", "Romeo");
    console.log(rromeo.getExtend());

    const nodes = (await rromeo.getEdgedNodes()).map(node => [
        node.getYildizID(), node.getIdentifier(), node.getProperties(), node.getExtend()]
    );
    console.log(nodes);

    const nodex = await rromeo.getEdgedNodes();
    console.log(nodex[0].getAttributes(), nodex[0].getEdge());

    const redge1 = await nodeHandler.edgeExistsId(romeo.getYildizID(), juliet.getYildizID(), loveRelation);
    const redge2 = await nodeHandler.edgeExists(julietIdentifier, romeoIdentifier, hateRelation);
    console.log(redge1, redge2);

    const redge3 = await nodeHandler.edgeExistsViaJoin(julietIdentifier, romeoIdentifier, hateRelation);
    console.log(redge3);

    const incRes = await nodeHandler.increaseEdgeDepthById(romeo.getYildizID(), juliet.getYildizID(), loveRelation);
    console.log(incRes);

    const decRes = await nodeHandler.decreaseEdgeDepthById(romeo.getYildizID(), juliet.getYildizID(), loveRelation);
    console.log(decRes);

    const updRes = await nodeHandler.updateEdgeByIds(romeo.getYildizID(), juliet.getYildizID(), loveRelation,
        {}, {}, otherRelation);
    console.log(updRes);

    //const delRes = await nodeHandler.removeEdgeByIds(romeo.getYildizID(), juliet.getYildizID(), otherRelation);
    //console.log(delRes);

    yildiz.close();
})();