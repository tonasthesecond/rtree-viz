import type { Point } from "../types/geometry";
import type {
  RTreeNode,
  RTreeLeafNode,
  RTreeInternalNode,
  InsertionRecord,
} from "../types/rtree";
import {
  bboxFromPoints,
  mergeBboxes,
  bboxArea,
  bboxEnlargement,
  pointBbox,
} from "./bbox";

export const MAX_ENTRIES = 4;
export const MIN_ENTRIES = 2;

let _nodeId = 0;
const nextId = () => `n${_nodeId++}`;
const deepClone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function makeLeaf(points: Point[]): RTreeLeafNode {
  const bbox =
    points.length > 0
      ? bboxFromPoints(points)
      : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { id: nextId(), bbox, points: [...points], isLeaf: true, level: 0 };
}

function makeInternal(children: RTreeNode[]): RTreeInternalNode {
  const bbox = children.map((c) => c.bbox).reduce(mergeBboxes);
  return {
    id: nextId(),
    bbox,
    children: [...children],
    isLeaf: false,
    level: children[0].level + 1,
  };
}

function splitLeafPoints(points: Point[]): [RTreeLeafNode, RTreeLeafNode] {
  let maxWaste = -Infinity;
  let s1 = 0,
    s2 = 1;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const waste =
        bboxArea(mergeBboxes(pointBbox(points[i]), pointBbox(points[j]))) -
        bboxArea(pointBbox(points[i])) -
        bboxArea(pointBbox(points[j]));
      if (waste > maxWaste) {
        maxWaste = waste;
        s1 = i;
        s2 = j;
      }
    }
  }
  const g1 = [points[s1]],
    g2 = [points[s2]];
  for (const p of points.filter((_, i) => i !== s1 && i !== s2)) {
    const e1 = bboxEnlargement(bboxFromPoints(g1), pointBbox(p));
    const e2 = bboxEnlargement(bboxFromPoints(g2), pointBbox(p));
    (e1 <= e2 ? g1 : g2).push(p);
  }
  return [makeLeaf(g1), makeLeaf(g2)];
}

function splitInternalChildren(
  children: RTreeNode[],
): [RTreeInternalNode, RTreeInternalNode] {
  let maxWaste = -Infinity;
  let s1 = 0,
    s2 = 1;
  for (let i = 0; i < children.length; i++) {
    for (let j = i + 1; j < children.length; j++) {
      const waste =
        bboxArea(mergeBboxes(children[i].bbox, children[j].bbox)) -
        bboxArea(children[i].bbox) -
        bboxArea(children[j].bbox);
      if (waste > maxWaste) {
        maxWaste = waste;
        s1 = i;
        s2 = j;
      }
    }
  }
  const g1 = [children[s1]],
    g2 = [children[s2]];
  for (const c of children.filter((_, i) => i !== s1 && i !== s2)) {
    const b1 = g1.map((x) => x.bbox).reduce(mergeBboxes);
    const b2 = g2.map((x) => x.bbox).reduce(mergeBboxes);
    const e1 = bboxEnlargement(b1, c.bbox);
    const e2 = bboxEnlargement(b2, c.bbox);
    (e1 <= e2 ? g1 : g2).push(c);
  }
  return [makeInternal(g1), makeInternal(g2)];
}

interface InsertResult {
  node: RTreeNode;
  split: RTreeNode | null;
}

function insertRec(
  node: RTreeNode,
  point: Point,
  record: Omit<InsertionRecord, "snapshotAfter">,
): InsertResult {
  record.pathNodeIds.push(node.id);

  if (node.isLeaf) {
    const leaf = node as RTreeLeafNode;
    const newPoints = [...leaf.points, point];

    record.descriptionLines.push(
      `Reached leaf ${node.id} [${leaf.points.map((p) => p.label).join(", ") || "empty"}]. ` +
        `Inserting ${point.label} → [${newPoints.map((p) => p.label).join(", ")}].`,
    );

    if (newPoints.length <= MAX_ENTRIES) {
      record.descriptionLines.push(
        `${newPoints.length}/${MAX_ENTRIES} entries in leaf ${node.id} — no split needed.`,
      );
      const updated: RTreeLeafNode = {
        ...leaf,
        points: newPoints,
        bbox: bboxFromPoints(newPoints),
      };
      return { node: updated, split: null };
    }

    record.descriptionLines.push(
      `Leaf ${node.id} overfull (${newPoints.length} > ${MAX_ENTRIES}). Quadratic split.`,
    );
    const [l1, l2] = splitLeafPoints(newPoints);
    l1.id = leaf.id;
    record.splitNodeIds.push(leaf.id, l2.id);
    record.descriptionLines.push(
      `Split → ${l1.id} [${l1.points.map((p) => p.label).join(", ")}] ` +
        `and new ${l2.id} [${l2.points.map((p) => p.label).join(", ")}].`,
    );
    return { node: l1, split: l2 };
  }

  const internal = node as RTreeInternalNode;
  const pb = pointBbox(point);

  let bestIdx = 0;
  let bestE = Infinity,
    bestA = Infinity;
  for (let i = 0; i < internal.children.length; i++) {
    const e = bboxEnlargement(internal.children[i].bbox, pb);
    const a = bboxArea(internal.children[i].bbox);
    if (e < bestE || (e === bestE && a < bestA)) {
      bestE = e;
      bestA = a;
      bestIdx = i;
    }
  }

  const chosen = internal.children[bestIdx];
  const enlargements = internal.children
    .map((c) => `${c.id}(+${bboxEnlargement(c.bbox, pb).toFixed(1)})`)
    .join(", ");

  record.descriptionLines.push(
    `At internal node ${node.id} (level ${node.level}): enlargements [${enlargements}]. ` +
      `Choosing ${chosen.id} (min enlargement +${bestE.toFixed(1)}).`,
  );

  const result = insertRec(chosen, point, record);

  const newChildren = [...internal.children];
  newChildren[bestIdx] = result.node;
  if (result.split) newChildren.push(result.split);

  const newBbox = newChildren.map((c) => c.bbox).reduce(mergeBboxes);

  if (newChildren.length <= MAX_ENTRIES) {
    const updated: RTreeInternalNode = {
      ...internal,
      children: newChildren,
      bbox: newBbox,
    };
    return { node: updated, split: null };
  }

  record.descriptionLines.push(
    `Internal node ${node.id} overfull (${newChildren.length} > ${MAX_ENTRIES}). Splitting.`,
  );
  const [n1, n2] = splitInternalChildren(newChildren);
  n1.id = internal.id;
  record.splitNodeIds.push(internal.id, n2.id);
  record.descriptionLines.push(
    `Split → ${n1.id} [${(n1 as RTreeInternalNode).children.map((c) => c.id).join(", ")}] ` +
      `and new ${n2.id} [${(n2 as RTreeInternalNode).children.map((c) => c.id).join(", ")}].`,
  );
  return { node: n1, split: n2 };
}

export function buildRTree(points: Point[]): {
  root: RTreeNode;
  records: InsertionRecord[];
} {
  _nodeId = 0;
  const records: InsertionRecord[] = [];
  let root: RTreeNode = makeLeaf([]);

  for (const point of points) {
    const record: Omit<InsertionRecord, "snapshotAfter"> = {
      point,
      pathNodeIds: [],
      splitNodeIds: [],
      rootGrew: false,
      descriptionLines: [
        `Inserting point ${point.label} at (${point.x.toFixed(1)}, ${point.y.toFixed(1)}).`,
      ],
    };

    const result = insertRec(root, point, record);

    if (result.split) {
      root = makeInternal([result.node, result.split]);
      record.rootGrew = true;
      record.descriptionLines.push(
        `Root split — new root ${root.id} created at level ${root.level}. Tree height: ${root.level + 1}.`,
      );
    } else {
      root = result.node;
    }

    records.push({ ...record, snapshotAfter: deepClone(root) });
  }

  return { root, records };
}

export function collectAllNodes(root: RTreeNode): RTreeNode[] {
  const result: RTreeNode[] = [root];
  if (!root.isLeaf) {
    for (const child of (root as RTreeInternalNode).children) {
      result.push(...collectAllNodes(child));
    }
  }
  return result;
}
