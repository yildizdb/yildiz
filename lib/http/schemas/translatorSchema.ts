import { get2xxResponse } from "./../helper";

const TRANSLATE_SCHEMA = {
  identifier: {
      type: "number",
  },
  value: {
      type: "string",
  },
  data: {
      type: "object",
      additionalProperties: true,
  },
  ttld: {
      type: "boolean",
  },
  created_at: {
      type: "string",
  },
};

const translatorSchema = {
  GET: {
      schema: {
          params: {
              identifier: {
                  type: "string",
              },
              required: true,
          },
          response: get2xxResponse(TRANSLATE_SCHEMA),
      },
  },
  POST: {
      body: {
          value: {
              type: "string",
          },
          identifier: {
              type: "string",
          },
          data: {
              type: "object",
              additionalProperties: true,
          },
          ttld: {
              type: "boolean",
          },
          required: ["value"],
      },
      schema: {
          response: get2xxResponse(TRANSLATE_SCHEMA),
      },
  },
  DELETE: {
      schema: {
          params: {
              identifier: {
                  type: "string",
              },
              required: true,
          },
          response: get2xxResponse({
              success: {
                  type: "boolean",
              },
          }),
      },
  },
};

export default translatorSchema;
