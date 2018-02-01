"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:translator");

const {
    strToInt
} = require("./../../utils/index.js");

class TranslatorSingle{

    constructor(yildiz){
        this.yildiz = yildiz || null;
        this.metadata = this.yildiz.metadata;
        this.dbConfig = this.yildiz.config.database;
        
        // Tables
        this.nodeTable = this.yildiz.nodeTable;
        this.ttlTable = this.yildiz.ttlTable;

        // Column Families
        this.columnFamilyNode = this.yildiz.columnFamilyNode;
        this.columnFamilyTTL = this.yildiz.columnFamilyTTL;
    }

    _incStat(key){
        if(this.yildiz){
            return this.yildiz.incStat(key);
        }
    }

    async storeTranslation(identifier, value = "unknown", data = {}, ttld = false){

        this._incStat("create_trans");
        
        const key = identifier + "";        
        const row = this.nodeTable.row(key);
        const CFName = this.columnFamilyNode.familyName;
        const qualifier = `${CFName}:value`;

        const requests = [row.save(qualifier, value)];

        if (ttld) {
            requests.push(this.ttlTable.insert([{
                key: key + "-translates",
                data: {
                    [this.columnFamilyTTL.familyName] : {
                        value: "1"
                    }
                }
            }]));
        }

        this.metadata.increaseCount("translates");

        return await Promise.all(requests);
    }

    async getTranslation(identifier){

        this._incStat("get_trans");

        const key = identifier + "";        
        const row = this.nodeTable.row(key);
        const CFName = this.columnFamilyNode.familyName;
        const qualifier = `${CFName}:value`;


        let result = {identifier};
        
        try {
            const rowGet = await row.get([qualifier]);
            result.value = rowGet[0] && rowGet[0][CFName] && rowGet[0][CFName].value[0].value;
        }
        catch (err) {
            debug("unable to get translation", err);
            result = null;
        }

        
        return result;
    }

    async getTranslationCount() {
        return await this.metadata.getCount("translates");
    }

    async removeTranslation(identifier){

        this._incStat("remove_trans");


        const key = identifier + "";        
        const row = this.nodeTable.row(key);
        const CFName = this.columnFamilyNode.familyName;
        const qualifier = `${CFName}:value`;
        const cells = [`${qualifier}`];

        this.metadata.decreaseCount("translates");
        return await row.deleteCells(cells);
    }

    strToInt(_str = ""){
        this._incStat("translate");
        return strToInt(_str);
    }
}

module.exports = TranslatorSingle;