import { get2xxResponse } from "./../helper.js";

const NODE_SCHEME = {
  id: {
      type: "number",
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
  created_at: {
      type: "string",
  },
};

const nodeSchema = {
  GET: {
      schema: {
          params: {
              identifier: {
                  type: "string",
              },
              required: true,
          },
          response: get2xxResponse(NODE_SCHEME),
      },
  },
  POST: {
      body: {
          identifier: {
              type: "string",
          },
          data: {
              type: "object",
              additionalProperties: true,
          },
          _extend: {
              type: "object",
              additionalProperties: true,
          },
          ttld: {
              type: "boolean",
          },
          required: ["identifier"],
      },
      schema: {
          response: get2xxResponse(NODE_SCHEME),
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

export default nodeSchema;
