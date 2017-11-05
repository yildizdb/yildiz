"use strict";

const murmur = require("murmurhash").v3;

class Translator {

    constructor(krakn){
        this.krakn = krakn || null;
        this._model = this.krakn ? this.krakn.models.Translate : null;
    }

    async storeTranslation(identifier, value = "unknown", data = {}){
        return await this._model.create({
            identifier,
            value,
            data
        });
    }

    async getTranslation(identifier){

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
        return await this._model.destroy({
            where: {
                [field]: identifier
            }
        });
    }

    strToInt(_str = ""){

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