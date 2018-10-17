declare module "@google-cloud/bigtable" {

  namespace Bigtable {

    export interface GenericObject {
        [key: string]: any;
    }

    export interface Config {
      projectId: string;
      keyFilename: string;
    }

    export interface FamilyRule {
      versions: number;
      age?: {
          seconds: number;
      };
      union?: boolean;
    }

    export interface MutateRule {
      method: string;
      key: string;
      data?: string[];
    }

    export interface FamilyConfig {
      rule: FamilyRule;
    }

    export interface RowRule {
      column: string;
      append?: string;
      increment?: number;
    }

    export interface TableInsertFormat {
      key: string;
      data: {
        [familyName: string]: any;
      };
    }

    export interface StreamParam {
      prefix?: string;
      keys?: string[];
      ranges?: Array<{
        start: Buffer | string;
        end: Buffer | string;
      }>;
      filter?: Array<{
        [filterName: string]: any;
      }>;
      limit?: number;
    }

    export interface Instance {
      table: (name: string) => Bigtable.Table;
      create: () => Promise<void>;
      exists: () => GenericObject[];
    }

    export interface Table {
      create: (name: string) => Promise<void>;
      family: (name: string) => Bigtable.Family;
      delete: () => Promise<void>;
      insert: (fromat: TableInsertFormat[]) => Promise<void>;
      createReadStream: (param: StreamParam) => any;
      mutate: (mutateRules: MutateRule[]) => Promise<any>;
      row: (key: string) => Bigtable.Row;
      exists: () => GenericObject[];
    }

    export interface Family {
      id: string;
      table: (name: string) => Bigtable.Table;
      create: (config: FamilyConfig) => Promise<void>;
      exists: () => GenericObject[];
    }

    export interface Row {
      create: (data: GenericObject) => Promise<void>;
      get: (cell?: string | string[]) => any;
      increment: (key: string, count?: number) => Promise<void>;
      save: (data: GenericObject) => Promise<void>;
      delete: () => Promise<void>;
      createRules: (rule: RowRule[]) => Promise<void>;
      deleteCells: (keys: string[]) => Promise<any>;
      exists: () => GenericObject[];
    }
  }

  class Bigtable {
    constructor(config: Bigtable.Config);
    public table: (name: string) => Bigtable.Table;
    public instance: (name: string) => Bigtable.Instance;
  }

  export = Bigtable;
}
