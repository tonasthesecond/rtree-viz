import type { BoundingBox, Point } from "./geometry";

export interface RTreeLeafNode {
  id: string;
  bbox: BoundingBox;
  points: Point[];
  isLeaf: true;
  level: 0;
}

export interface RTreeInternalNode {
  id: string;
  bbox: BoundingBox;
  children: RTreeNode[];
  isLeaf: false;
  level: number;
}

export type RTreeNode = RTreeLeafNode | RTreeInternalNode;

export type QueryType = "range" | "knn" | "point";

export interface InsertionRecord {
  point: Point;
  pathNodeIds: string[];
  splitNodeIds: string[];
  rootGrew: boolean;
  descriptionLines: string[];
  snapshotAfter: RTreeNode;
}

export interface QueryStep {
  label: string;
  descriptionLines: string[];
  visitedNodeIds: string[];
  prunedNodeIds: string[];
  resultPointIds: string[];
}

export interface QueryResult {
  queryType: QueryType;
  steps: QueryStep[];
  resultPointIds: string[];
  rtreeNodeVisits: number;
  exhaustiveComparisons: number;
  rtreeTimeMs: number;
  exhaustiveTimeMs: number;
}

export interface RangeParams {
  type: "range";
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface KnnParams {
  type: "knn";
  x: number;
  y: number;
  k: number;
}

export interface PointParams {
  type: "point";
  pointId: string;
}

export type QueryParams = RangeParams | KnnParams | PointParams;
