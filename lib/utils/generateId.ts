import uuid from "uuid/v4";
import murmur from "murmurhash";

const generateId = (id?: string | number) => {

    if (!id) {
        return id;
    }

    return murmur.v3(uuid());
};

export default generateId;
