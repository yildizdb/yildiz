import Bigtable from "@google-cloud/bigtable";

export interface YildizModel {

  instance: Bigtable.Instance;

  nodeTable: Bigtable.Table;
  ttlTable: Bigtable.Table;
  metadataTable: Bigtable.Table;
  popnodeTable: Bigtable.Table;
  cacheTable: Bigtable.Table;

  columnFamilyNode: Bigtable.Family;
  columnFamilyTTL: Bigtable.Family;
  columnFamilyMetadata: Bigtable.Family;
  columnFamilyPopnode: Bigtable.Family;
  columnFamilyCache: Bigtable.Family;
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
