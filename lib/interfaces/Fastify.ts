export interface GenericSchema {
  required?: string | string[];
  [key: string]: string | string[] | undefined | {
      type: string;
      additionalProperties?: boolean;
      items?: {
        type: string;
        additionalProperties?: boolean;
      };
  };
}
