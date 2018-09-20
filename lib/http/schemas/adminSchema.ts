import { get200ObjectSchema } from "./../helper";

const adminSchema = {
  HEALTH: get200ObjectSchema({
      status: { type: "string" },
  }),
  COUNTS: get200ObjectSchema({
      edges: { type: "number" },
      nodes: { type: "number" },
      ttls: { type: "number" },
  }),
};

export default adminSchema;
