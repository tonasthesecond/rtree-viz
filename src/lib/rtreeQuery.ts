import type { Point } from "../types/geometry";
import type {
  RTreeNode,
  RTreeInternalNode,
  RTreeLeafNode,
  QueryResult,
  QueryStep,
  RangeParams,
  KnnParams,
  PointParams,
  QueryParams,
} from "../types/rtree";
import {
  bboxIntersects,
  bboxContainsPoint,
  minDistPointToBbox,
  euclidean,
} from "./bbox";

function rangeQuery(root: RTreeNode, params: RangeParams): QueryResult {
  const queryBbox = {
    minX: params.minX,
    minY: params.minY,
    maxX: params.maxX,
    maxY: params.maxY,
  };
  const steps: QueryStep[] = [];
  const results: string[] = [];
  let nodeVisits = 0;

  function visit(node: RTreeNode) {
    nodeVisits++;
    if (!bboxIntersects(node.bbox, queryBbox)) {
      steps.push({
        label: `Prune ${node.id}`,
        descriptionLines: [
          `Node ${node.id} bbox does not intersect query region — pruned entire subtree.`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [node.id],
        resultPointIds: [...results],
      });
      return;
    }

    if (node.isLeaf) {
      const leaf = node as RTreeLeafNode;
      const found = leaf.points.filter((p) =>
        bboxContainsPoint(queryBbox, p.x, p.y),
      );
      found.forEach((p) => results.push(p.id));
      steps.push({
        label: `Scan leaf ${node.id}`,
        descriptionLines: [
          `Leaf ${node.id} intersects query. Scanning ${leaf.points.length} point(s): [${leaf.points.map((p) => p.label).join(", ")}].`,
          found.length > 0
            ? `Found ${found.length} match(es): [${found.map((p) => p.label).join(", ")}].`
            : `No points fall inside the query region.`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [],
        resultPointIds: [...results],
      });
    } else {
      const internal = node as RTreeInternalNode;
      steps.push({
        label: `Visit ${node.id}`,
        descriptionLines: [
          `Internal node ${node.id} (level ${node.level}) intersects query. Descending into ${internal.children.length} children.`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [],
        resultPointIds: [...results],
      });
      for (const child of internal.children) visit(child);
    }
  }

  visit(root);
  return {
    queryType: "range",
    steps,
    resultPointIds: results,
    rtreeNodeVisits: nodeVisits,
    exhaustiveComparisons: 0,
    rtreeTimeMs: 0,
    exhaustiveTimeMs: 0,
  };
}

function knnQuery(root: RTreeNode, params: KnnParams): QueryResult {
  const { x, y, k } = params;
  const steps: QueryStep[] = [];
  let nodeVisits = 0;

  type QueueEntry = { dist: number; node: RTreeNode };
  const queue: QueueEntry[] = [{ dist: 0, node: root }];
  const candidates: Array<{ dist: number; point: Point }> = [];

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const { dist, node } = queue.shift()!;
    nodeVisits++;

    const worstKDist =
      candidates.length >= k ? candidates[k - 1].dist : Infinity;

    if (dist > worstKDist) {
      steps.push({
        label: `Prune ${node.id}`,
        descriptionLines: [
          `Node ${node.id} min-dist to query (${dist.toFixed(1)}) ≥ current ${k}-th nearest distance (${worstKDist.toFixed(1)}). Pruned.`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [node.id],
        resultPointIds: candidates.slice(0, k).map((c) => c.point.id),
      });
      continue;
    }

    if (node.isLeaf) {
      const leaf = node as RTreeLeafNode;
      for (const p of leaf.points) {
        const d = euclidean(p.x, p.y, x, y);
        candidates.push({ dist: d, point: p });
      }
      candidates.sort((a, b) => a.dist - b.dist);
      const topK = candidates.slice(0, k);
      steps.push({
        label: `Scan leaf ${node.id}`,
        descriptionLines: [
          `Leaf ${node.id}: checking [${leaf.points.map((p) => p.label).join(", ")}].`,
          `Top-${k} so far: [${topK.map((c) => `${c.point.label}(d=${c.dist.toFixed(1)})`).join(", ")}].`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [],
        resultPointIds: topK.map((c) => c.point.id),
      });
    } else {
      const internal = node as RTreeInternalNode;
      steps.push({
        label: `Visit ${node.id}`,
        descriptionLines: [
          `Internal node ${node.id} (level ${node.level}): enqueuing ${internal.children.length} children sorted by min-dist to query point.`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [],
        resultPointIds: candidates.slice(0, k).map((c) => c.point.id),
      });
      for (const child of internal.children) {
        queue.push({ dist: minDistPointToBbox(child.bbox, x, y), node: child });
      }
    }
  }

  return {
    queryType: "knn",
    steps,
    resultPointIds: candidates.slice(0, k).map((c) => c.point.id),
    rtreeNodeVisits: nodeVisits,
    exhaustiveComparisons: 0,
    rtreeTimeMs: 0,
    exhaustiveTimeMs: 0,
  };
}

function pointQuery(
  root: RTreeNode,
  params: PointParams,
  allPoints: Point[],
): QueryResult {
  const target = allPoints.find((p) => p.id === params.pointId);
  if (!target) {
    return {
      queryType: "point",
      steps: [],
      resultPointIds: [],
      rtreeNodeVisits: 0,
      exhaustiveComparisons: 0,
      rtreeTimeMs: 0,
      exhaustiveTimeMs: 0,
    };
  }

  const steps: QueryStep[] = [];
  let nodeVisits = 0;
  const found: string[] = [];

  function visit(node: RTreeNode) {
    nodeVisits++;
    if (!bboxContainsPoint(node.bbox, target.x, target.y)) {
      steps.push({
        label: `Prune ${node.id}`,
        descriptionLines: [
          `Node ${node.id} bbox does not contain (${target.x.toFixed(1)}, ${target.y.toFixed(1)}) — pruned.`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [node.id],
        resultPointIds: [...found],
      });
      return;
    }

    if (node.isLeaf) {
      const leaf = node as RTreeLeafNode;
      const match = leaf.points.find((p) => p.id === target.id);
      if (match) found.push(match.id);
      steps.push({
        label: `Scan leaf ${node.id}`,
        descriptionLines: [
          `Leaf ${node.id} contains target coordinate. Checking [${leaf.points.map((p) => p.label).join(", ")}].`,
          match
            ? `Found ${target.label}.`
            : `${target.label} not in this leaf.`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [],
        resultPointIds: [...found],
      });
    } else {
      steps.push({
        label: `Visit ${node.id}`,
        descriptionLines: [
          `Internal node ${node.id} contains target coordinate. Descending into ${(node as RTreeInternalNode).children.length} children.`,
        ],
        visitedNodeIds: [node.id],
        prunedNodeIds: [],
        resultPointIds: [...found],
      });
      for (const child of (node as RTreeInternalNode).children) visit(child);
    }
  }

  visit(root);
  return {
    queryType: "point",
    steps,
    resultPointIds: found,
    rtreeNodeVisits: nodeVisits,
    exhaustiveComparisons: 0,
    rtreeTimeMs: 0,
    exhaustiveTimeMs: 0,
  };
}

export function runQuery(
  root: RTreeNode,
  params: QueryParams,
  allPoints: Point[],
): QueryResult {
  const t0 = performance.now();
  let result: QueryResult;

  if (params.type === "range") {
    result = rangeQuery(root, params);
  } else if (params.type === "knn") {
    result = knnQuery(root, params);
  } else {
    result = pointQuery(root, params, allPoints);
  }

  result.rtreeTimeMs = performance.now() - t0;
  return result;
}
