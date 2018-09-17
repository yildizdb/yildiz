import murmur from "murmurhash";

const strToInt = (str: number | string | null | undefined) => {

    if (str === null || typeof str === "undefined") {
        throw new Error("str to int field is null or undefined.");
    }

    // speed up on body values for example
    if (typeof str === "number") {
        return str;
    }

    // for req params for example, check if string is numeric
    if (!isNaN(Number(str))) {
        return parseInt(str, 10);
    }

    // if it's a string, we need to hash
    return murmur.v3(str);
};

export default strToInt;
