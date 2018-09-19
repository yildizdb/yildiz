import { get2xxResponse } from "./../helper";

const accessSchema = {
  EDGES: {
      schema: {
          body: {
              values: {
                  type: "array",
                  items: {
                      type: "string",
                  },
              },
              required: ["values"],
          },
          response: get2xxResponse({
              identifiers: {
                  type: "array",
                  items: {
                      type: "object",
                      additionalProperties: true,
                  },
              },
              nodes: {
                  type: "array",
                  items: {
                      type: "object",
                      additionalProperties: true,
                  },
              },
              edges: {
                  type: "array",
                  items: {
                      type: "object",
                      additionalProperties: true,
                  },
              },
          }),
      },
  },
  SC_RELATION: {
      schema: {
          body: {
              leftNodeIdentifierVal: {
                  type: "string",
              },
              rightNodeIdentifierVal: {
                  type: "string",
              },
              leftNodeData: {
                  type: "object",
                  additionalProperties: true,
              },
              rightNodeData: {
                  type: "object",
                  additionalProperties: true,
              },
              ttld: {
                  type: "boolean",
              },
              relation: {
                  type: "string",
              },
              edgeData: {
                  type: "object",
                  additionalProperties: true,
              },
              depthBeforeCreation: {
                  type: "boolean",
              },
              required: [
                  "leftNodeIdentifierVal", "rightNodeIdentifierVal", "leftNodeData", "rightNodeData",
                  "ttld", "relation", "edgeData", "depthBeforeCreation",
              ],
          },
          response: get2xxResponse({}, true),
      },
  },
  DELETE_NODE_RELATION: {
      schema: {
          params: {
              identifier: {
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
};

export default accessSchema;
