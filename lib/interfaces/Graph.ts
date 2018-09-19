import { AnyObject } from "./Generic";

export interface EdgeRaw {
  leftNodeId?: string | number;
  rightNodeId?: string | number;
  relation?: string | number;
  edgeTime?: string | number;
  data: any;
}

export interface EdgeCache {
  id: Array<string | number>;
  data: AnyObject;
}

export interface NodeEdgeUpsert {
  leftNodeIdentifierVal: string | number;
  rightNodeIdentifierVal: string | number;
  leftNodeData: any;
  rightNodeData: any;
  ttld?: boolean;
  relation?: string | number;
  edgeData: any;
  depthBeforeCreation?: boolean;
  isPopularRightNode?: boolean;
  edgeTime?: string | number;
}
