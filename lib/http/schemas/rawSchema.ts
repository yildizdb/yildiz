import { get2xxResponse } from "./../helper";

const rawSchema = {
    QUERY: {
        body: {
            query: {
                type: "string",
            },
            replacements: {
                type: "object",
                additionalProperties: true,
            },
            required: ["query"],
        },
        schema: {
            response: get2xxResponse({
                results: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: true,
                    },
                },
            }),
        },
    },
    SPREAD: {
        body: {
            query: {
                type: "string",
            },
            replacements: {
                type: "object",
                additionalProperties: true,
            },
            required: ["query"],
        },
        schema: {
            response: get2xxResponse({
                metadata: {
                    type: "object",
                    additionalProperties: true,
                },
            }),
        },
    },
};

export default rawSchema;
