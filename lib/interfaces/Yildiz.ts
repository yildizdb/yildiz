import Bigtable from "@google-cloud/bigtable";

export interface YildizModel {

  instance: Bigtable.Instance;

  nodeTable: Bigtable.Table;
  ttlTable: Bigtable.Table;
  metadataTable: Bigtable.Table;
  popnodeTable: Bigtable.Table;
  cacheTable: Bigtable.Table;

  columnFamilyNode: any;
  columnFamilyTTL: any;
  columnFamilyMetadata: any;
  columnFamilyPopnode: any;
  columnFamilyCache: any;
}

export interface YildizSingleSchema {
  id?: string | number;
  identifier?: string | number;
  value?: any;
  [key: string]: any;
}

export interface YildizResultSchema {
  identifiers?: YildizSingleSchema[];
  nodes?: YildizSingleSchema[];
  edges?: YildizSingleSchema[];
}

export interface YildizUpsertSchema {
  edgeId?: string[];
  leftNodeId: string;
  rightNodeId: string;
}
