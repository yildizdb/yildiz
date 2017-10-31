"use strict";

const murmur = require("murmurhash").v3;

class Translator {

    constructor(krakn){
        this.krakn = krakn;
        this._model = this.krakn.models.Translate;
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

    strToInt(str){
        return murmur(str);
    }
}

module.exports = Translator;