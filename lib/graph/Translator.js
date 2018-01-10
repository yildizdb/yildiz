"use strict";

const debug = require("debug")("yildiz:translator");

const {
    strToInt
} = require("./../utils/index.js");

class Translator {

    constructor(yildiz){
        this.yildiz = yildiz || null;
        this._model = this.yildiz ? this.yildiz.models.Translate : null;
    }

    _incStat(key){
        if(this.yildiz){
            return this.yildiz.incStat(key);
        }
    }

    async storeTranslation(identifier, value = "unknown", data = {}, ttld = false){
        this._incStat("create_trans");
        return await this._model.create({
            identifier,
            value,
            data,
            ttld
        }).then(result => {
            debug("translation created.", identifier, value);
            return result;
        });
    }

    async getTranslation(identifier){

        this._incStat("get_trans");
        const translate = await this._model.findOne({
            where: {
                identifier
            }
        });

        if(!translate){
            return null;
        }

        return translate.get();
    }

    async removeTranslation(identifier, field = "identifier"){
        this._incStat("remove_trans");
        return await this._model.destroy({
            where: {
                [field]: identifier
            }
        });
    }

    strToInt(_str = ""){
        this._incStat("translate");
        return strToInt(_str);
    }
}

module.exports = Translator;