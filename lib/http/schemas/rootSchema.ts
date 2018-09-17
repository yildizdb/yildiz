import { get200ObjectSchema } from "./../helper";

const rootSchema = {
  ROOT: get200ObjectSchema({
      version: { type: "string" },
  }),
};

export default rootSchema;
