"use strict";

const {strToInt} = require("./../../utils/index.js");

class Translator {
    /***
     * Dummy class for http endpoint, used in RDBMS but not in Bigtable
     */

    constructor(){
        // Do nothing to pollute memory
    }

    storeTranslation(identifier){
        // Not storing just returning the identifier
        return {identifier};
    }

    getTranslation(identifier){
        // Will just return identifier
        return {identifier};
    }

    strToInt(_str = ""){
        return strToInt(_str);
    }

    getTranslationCount() {
        return 0;
    }
}

module.exports = Translator;