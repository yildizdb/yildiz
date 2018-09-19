import Debug from "debug";
import { ServiceConfig } from "../interfaces/ServiceConfig";
import { GenericObject, AnyObject } from "../interfaces/Generic";

const debug = Debug("yildiz:accesshandler");

export class AccessHandler {

    private access: string | AnyObject;

    constructor(config: ServiceConfig) {

        // Set to access all prefix, if it is not configured
        if (!config.access) {
            debug("access is not configured, every prefix is allowed.");
            config.access = "*";
        }

        // Check config's access field if it is string
        if (typeof config.access === "string") {
            if (config.access === "*") {
                debug("access is opened to any prefix.");
            } else {
                throw new Error("access is configured to " + config.access
                    + " which is not supported, defaulting to * - allowing any prefix.");
            }
        }

        // Check config's access field if it is object
        if (config.access && typeof config.access === "object") {

            Object.keys(config.access).forEach((key: string) => {

                if (typeof key !== "string") {
                    debug("access keys must be a string, as they represent the prefix",
                        key, "is not, which is why it was removed.");
                    delete config.access![key];
                    return;
                }

                if ((!Array.isArray((config.access as AnyObject)![key]) &&
                    typeof (config.access as AnyObject)![key] !== "string")) {

                    debug("access values must be token arrays or wildcards(*), removing", key);
                    delete (config.access as AnyObject)![key];
                }

                if (typeof (config.access as AnyObject)![key] === "string" &&
                    (config.access as AnyObject)![key] !== "*") {

                    throw new Error(`access key ${key} is set with a different value than '*', it must be an array.`);
                }
            });

            if (config.access["*"]) {
                if (!Array.isArray(config.access["*"])) {
                    throw new Error("When access key '*' is defined, it must be an array.");
                }
                debug("key * is configured, meaning a few tokens will be able to create any prefix.");
            } else {
                debug("access is allowed for these prefixes only:", Object.keys(config.access).join(", "));
            }
        }

        this.access = config.access;

        if (this.access !== "*" && typeof this.access !== "object") {
            throw new Error("bad access configuration passed: " + this.access);
        }
    }

    public isPrefixWithTokenAllowed(prefix: string, token?: string) {

        // -1 prefix not allowed
        // 0 noth authorized
        // 1 good to go

        if (this.access === "*") {
            return 1;
        }

        let badToken = false;
        if ((this.access as AnyObject)[prefix]) {

            if (Array.isArray((this.access as AnyObject)[prefix])) {

                // find token or forbid later
                for (const access of (this.access as AnyObject)[prefix]) {
                    if (access === token) {
                        return 1;
                    }
                }
                badToken = true;
                // dont end here, as it might be "*" token
            } else {
                // should be string = *
                return 1;
            }
        }

        if ((this.access as AnyObject)["*"]) {

            // find token or forbid
            for (const access of (this.access as AnyObject)["*"]) {
                if (access === token) {
                    return 1;
                }
            }

            return 0;
        }

        if (badToken) {
            return 0;
        }

        return -1;
    }
}
