import { get2xxResponse } from "./../helper";

const pathSchema = {
  SHORTEST: {
      schema: {
          body: {
              start: {
                  type: "number",
              },
              end: {
                  type: "number",
              },
              required: ["start", "end"],
          },
          response: get2xxResponse({
              paths: {
                  type: "array",
                  items: {
                      type: "object",
                      additionalProperties: true,
                  },
              },
          }),
      },
  },
};

export default pathSchema;
