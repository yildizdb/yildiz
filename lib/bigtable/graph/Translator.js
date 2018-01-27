"use strict";

const Promise = require("bluebird");
const debug = require("debug")("yildiz:translator");

const {
    strToInt
} = require("./../../utils/index.js");

class Translator {

    constructor(yildiz){
        this.yildiz = yildiz || null;
        this.translateTable = this.yildiz && this.yildiz.translateTable;
        this.columnFamilyTranslate = this.yildiz.columnFamilyTranslate;
        this.ttlTable = this.yildiz.ttlTable;
        this.columnFamilyTTL = this.yildiz.columnFamilyTTL;
        this.metadata = this.yildiz.metadata;
    }

    _incStat(key){
        if(this.yildiz){
            return this.yildiz.incStat(key);
        }
    }

    async storeTranslation(identifier, value = "unknown", data = {}, ttld = false){
        
        const key = identifier + "";
        ttld = ttld + "";

        const val = {
            key,
            data: {
                [this.columnFamilyTranslate.familyName] : {
                    value,
                    data: JSON.stringify(data),
                    ttld
                }
            }
        };

        const valTTL = {
            key: key + "-translates",
            data: {
                [this.columnFamilyTTL.familyName] : {
                    value: "1"
                }
            }
        };

        const requests = [this.translateTable.insert([val])];

        if (ttld) {
            requests.push(this.ttlTable.insert([valTTL]));
        }
        
        this._incStat("create_trans");
        this.metadata.increaseCount("translates");

        debug("translation created.", identifier, value);

        return await Promise.all(requests);
    }

    async getTranslation(identifier){

        this._incStat("get_trans");

        let result = {identifier};
        const row = this.translateTable.row(identifier+"");
        try {
            const rowGet = await row.get();
            const raw = rowGet && rowGet[0] && rowGet[0].data && rowGet[0].data[this.columnFamilyTranslate.familyName];
            Object.keys(raw).forEach(n => {
                result[n] = n === "data" ? JSON.parse(raw[n][0].value) : raw[n][0].value;
            });
        }
        catch (err) {
            result = null;
        }
        
        return result;
    }

    async getTranslationFromValue(value) {

        return new Promise((resolve, reject) => {

            this.translateTable.createReadStream({
                filter: [{
                    column: "value"
                }, {
                    value: value
                }]
            })
            .on("error", err => {
                reject(err);
            })
            .on("data", async n => {
                resolve(n.id);
            })
            .on("end", async n => {
                resolve(null);
            });
        });
    }

    async getTranslationCount() {
        return this.metadata.getCount("translates");
    }

    async removeTranslation(identifier, field = "identifier"){

        this._incStat("remove_trans");
        this.metadata.decreaseCount("translates");

        const row = this.translateTable.row(identifier + "");
        return await row.delete();
    }

    strToInt(_str = ""){
        this._incStat("translate");
        return strToInt(_str);
    }
}

module.exports = Translator;