"use strict";

const murmur = require("murmurhash").v3;
const debug = require("debug")("yildiz:translator");

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

        if(_str === null || _str === "undefined"){
            throw new Error("str to int field is null or undefined.");
        }

        this._incStat("translate");

        //speed up on body values for example
        if(typeof _str === "number"){
            return _str;
        }

        //for req params for example
        let str = parseInt(_str);
        if(!isNaN(str)){
            return str;
        }

        //its a string, we need to hash
        return murmur(_str);
    }
}

module.exports = Translator;