declare module "@google-cloud/bigtable" {

  // TODO: Reduce any if possible
  
  namespace Bigtable {

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

      export interface FamilyConfig {
        rule: FamilyRule;
      }

      export interface RowRule {
        column: string;
        append: string;
      }

      export interface Instance {
        table: (name: string) => Bigtable.Table;
        create: () => Promise<void>;
        exists: () => Object[];
      }

      export interface Table {
          create: (name: string) => Promise<void>;
          family: (name: string) => Bigtable.Family;
          delete: () => Promise<void>;
          insert: (...args: any[]) => Promise<void>;
          createReadStream: (...args: any[]) => any;
          row: (key: string) => Bigtable.Row;
          exists: () => Object[];
      }

      export interface Family {
        id: string;
        table: (name: string) => Bigtable.Table;
        create: (config: FamilyConfig) => Promise<void>;
        exists: () => Object[];
      }

      export interface Row {
        create: (data: Object) => Promise<void>;
        get: (cell?: string | string[]) => any;
        increment: (key: string, count?: number) => Promise<void>;
        save: (data: Object) => Promise<void>;
        delete: () => Promise<void>;
        createRules: (rule: RowRule[]) => Promise<void>;
        deleteCells: (keys: string[]) => Promise<any>;
        exists: () => Object[];
      }
  }

  class Bigtable {
      constructor(config: Bigtable.Config);
      public table: (name: string) => Bigtable.Table;
      public instance: (name: string) => Bigtable.Instance;
  }

  export = Bigtable;
}
