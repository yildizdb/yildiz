import { strToInt } from "../../utils";

/***
 * Dummy class for http endpoint, outdated but still used in test
 *
 */
export class Translator {

    constructor() {
        // Do nothing to pollute memory
    }

    public storeTranslation(identifier: number | string, ...args: any[]) {
        // Not storing just returning the identifier
        return {identifier};
    }

    public getTranslation(identifier: string) {
        // Will just return identifier
        return {identifier};
    }

    public strToInt(str = "") {
        return strToInt(str);
    }

    public removeTranslation(identifier?: string) {
        return;
    }

    public getTranslationCount() {
        return 0;
    }
}
