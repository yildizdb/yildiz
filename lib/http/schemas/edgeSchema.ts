import { get2xxResponse } from "./../helper";

const EDGE_SCHEME = {
  id: {
      type: "string",
  },
  depth: {
      type: "number",
  },
  relation: {
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

const LEFT_EDGE_SCHEME = Object.assign({}, EDGE_SCHEME, {
  right_node_id: {
      type: "number",
  },
});

const RIGHT_EDGE_SCHEME = Object.assign({}, EDGE_SCHEME, {
  left_node_id: {
      type: "number",
  },
});

const BOTH_EDGE_SCHEME = Object.assign({}, EDGE_SCHEME, {
  right_node_id: {
      type: "number",
  },
  left_node_id: {
      type: "number",
  },
});

const edgeSchema = {
  GET: {
      schema: {
          params: {
              leftId: {
                  type: "string",
              },
              rightId: {
                  type: "string",
              },
              relation: {
                  type: "string",
              },
          },
          response: get2xxResponse(EDGE_SCHEME),
      },
  },
  POST: {
      body: {
          leftId: {
              type: "number",
          },
          rightId: {
              type: "number",
          },
          relation: {
              type: "string",
          },
          attributes: {
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
          required: ["leftId", "rightId", "relation"],
      },
      schema: {
          response: get2xxResponse({
              success: {
                  type: "boolean",
              },
          }),
      },
  },
  PUT_INC: {
      body: {
          leftId: {
              type: "number",
          },
          rightId: {
              type: "number",
          },
          relation: {
              type: "string",
          },
          required: ["leftId", "rightId", "relation"],
      },
      schema: {
          response: get2xxResponse({
              success: {
                  type: "boolean",
              },
          }),
      },
  },
  PUT_DEC: {
      body: {
          leftId: {
              type: "number",
          },
          rightId: {
              type: "number",
          },
          relation: {
              type: "string",
          },
          required: ["leftId", "rightId", "relation"],
      },
      schema: {
          response: get2xxResponse({
              success: {
                  type: "boolean",
              },
          }),
      },
  },
  DELETE: {
      schema: {
          params: {
              leftId: {
                  type: "number",
              },
              rightId: {
                  type: "number",
              },
              relation: {
                  type: "string",
              },
          },
          response: get2xxResponse({
              success: {
                  type: "boolean",
              },
          }),
      },
  },
  GET_LEFT: {
      schema: {
          params: {
              id: {
                  type: "string",
              },
              relation: {
                  type: "string",
              },
          },
          response: get2xxResponse({
              edges: {
                  type: "array",
                  items: {
                      type: "object",
                      properties: LEFT_EDGE_SCHEME,
                  },
              },
          }),
      },
  },
  GET_RIGHT: {
      schema: {
          params: {
              id: {
                  type: "string",
              },
              relation: {
                  type: "string",
              },
          },
          response: get2xxResponse({
              edges: {
                  type: "array",
                  items: {
                      type: "object",
                      properties: RIGHT_EDGE_SCHEME,
                  },
              },
          }),
      },
  },
  GET_BOTH: {
      schema: {
          params: {
              id: {
                  type: "string",
              },
              relation: {
                  type: "string",
              },
          },
          response: get2xxResponse({
              edges: {
                  type: "array",
                  items: {
                      type: "object",
                      properties: BOTH_EDGE_SCHEME,
                  },
              },
          }),
      },
  },
};

export default edgeSchema;
