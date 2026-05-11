import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Graph } from "../types/geometry";
import type { RTreeNode, RTreeInternalNode } from "../types/rtree";

export type HoverItem =
  | { kind: "node"; id: string }
  | { kind: "point"; id: string };

interface HoverCtx {
  graph: Graph;
  rtreeRoot: RTreeNode | null;
  hovered: HoverItem | null;
  setHovered: (h: HoverItem | null) => void;
  cursor: { x: number; y: number };
  setCursor: (p: { x: number; y: number }) => void;
}

const Ctx = createContext<HoverCtx | null>(null);

export function useHover(): HoverCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("HoverContext: missing provider");
  return v;
}

function findNode(root: RTreeNode | null, id: string): RTreeNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (!root.isLeaf) {
    for (const c of (root as RTreeInternalNode).children) {
      const f = findNode(c, id);
      if (f) return f;
    }
  }
  return null;
}

function nodePath(root: RTreeNode | null, nodeId: string): string[] {
  if (!root) return [];
  const trail: string[] = [];
  function walk(n: RTreeNode): boolean {
    trail.push(n.id);
    if (n.id === nodeId) return true;
    if (!n.isLeaf) {
      for (const c of (n as RTreeInternalNode).children) {
        if (walk(c)) return true;
      }
    }
    trail.pop();
    return false;
  }
  walk(root);
  return trail;
}

function leafForPoint(
  root: RTreeNode | null,
  pid: string,
): RTreeNode | null {
  if (!root) return null;
  if (root.isLeaf) {
    return root.points.some((p) => p.id === pid) ? root : null;
  }
  for (const c of (root as RTreeInternalNode).children) {
    const f = leafForPoint(c, pid);
    if (f) return f;
  }
  return null;
}

function subtreeLeaves(
  node: RTreeNode,
): Array<{ id: string; points: string[] }> {
  if (node.isLeaf) {
    return [{ id: node.id, points: node.points.map((p) => p.label) }];
  }
  const out: Array<{ id: string; points: string[] }> = [];
  for (const c of (node as RTreeInternalNode).children) {
    out.push(...subtreeLeaves(c));
  }
  return out;
}

export function HoverProvider({
  graph,
  rtreeRoot,
  children,
}: {
  graph: Graph;
  rtreeRoot: RTreeNode | null;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState<HoverItem | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  return (
    <Ctx.Provider
      value={{ graph, rtreeRoot, hovered, setHovered, cursor, setCursor }}
    >
      {children}
      <HoverTooltip />
    </Ctx.Provider>
  );
}

function HoverTooltip() {
  const { hovered, cursor, graph, rtreeRoot } = useHover();
  if (!hovered) return null;

  const maxLevel = rtreeRoot ? rtreeRoot.level : 0;
  let title = "";
  const rows: Array<[string, string]> = [];

  if (hovered.kind === "node") {
    const node = findNode(rtreeRoot, hovered.id);
    if (!node) return null;

    title = `Node ${node.id}`;
    rows.push(["Type", node.isLeaf ? "leaf" : "internal"]);
    rows.push(["Level", `${node.level} of ${maxLevel}`]);
    rows.push([
      "Bounds",
      `x: ${node.bbox.minX.toFixed(0)}–${node.bbox.maxX.toFixed(0)}, y: ${node.bbox.minY.toFixed(0)}–${node.bbox.maxY.toFixed(0)}`,
    ]);

    if (node.isLeaf) {
      rows.push([
        "Points",
        node.points.length === 0
          ? "(empty)"
          : node.points.map((p) => p.label).join(", "),
      ]);
    } else {
      const internal = node as RTreeInternalNode;
      rows.push([
        "Children",
        internal.children.map((c) => c.id).join(", "),
      ]);
      const leaves = subtreeLeaves(node);
      rows.push([
        "Subtree leaves",
        leaves
          .map(
            (l) =>
              `${l.id}[${l.points.length ? l.points.join(",") : "·"}]`,
          )
          .join("  "),
      ]);
    }
    rows.push(["Path", nodePath(rtreeRoot, node.id).join(" › ")]);
  } else {
    const p = graph.points.find((p) => p.id === hovered.id);
    if (!p) return null;
    title = `Point ${p.label}`;
    rows.push(["Coords", `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`]);
    const leaf = leafForPoint(rtreeRoot, p.id);
    if (leaf) {
      rows.push(["In leaf", leaf.id]);
      rows.push([
        "Leaf path",
        nodePath(rtreeRoot, leaf.id).join(" › "),
      ]);
    }
  }

  const offset = 14;
  const maxW = 320;
  let left = cursor.x + offset;
  let top = cursor.y + offset;
  if (typeof window !== "undefined") {
    if (left + maxW > window.innerWidth) left = cursor.x - maxW - offset;
    if (top + 220 > window.innerHeight) top = cursor.y - 220 - offset;
    left = Math.max(4, left);
    top = Math.max(4, top);
  }

  return (
    <div
      className="hover-tooltip"
      style={{ position: "fixed", left, top, maxWidth: maxW }}
    >
      <div className="tt-title">{title}</div>
      <dl className="tt-rows">
        {rows.map(([k, v], i) => (
          <div key={i} className="tt-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
