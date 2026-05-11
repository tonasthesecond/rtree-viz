import { useMemo } from "react";
import type { Graph, BoundingBox } from "../types/geometry";
import type { RTreeNode, RTreeInternalNode } from "../types/rtree";
import { useHover } from "./HoverContext";

interface Props {
  graph: Graph;
  rtreeRoot: RTreeNode | null;
  highlightNodeIds: Set<string>;
  prunedNodeIds: Set<string>;
  queryRegion: BoundingBox | null;
  resultPointIds: Set<string>;
  queryPoint: { x: number; y: number } | null;
  width: number;
  height: number;
  onCanvasClick?: (x: number, y: number) => void;
}

function hashHue(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) * 47) % 360;
}

function leafPalette(id: string) {
  const hue = hashHue(id);
  return {
    hue,
    stroke: `hsl(${hue} 55% 42%)`,
    fillSolid: `hsl(${hue} 60% 50%)`,
    fillSoft: `hsla(${hue}, 75%, 55%, 0.14)`,
    fillStrong: `hsla(${hue}, 75%, 55%, 0.26)`,
  };
}

function neutralStroke(level: number): string {
  const lightness = Math.max(20, 55 - level * 10);
  return `hsl(220 8% ${lightness}%)`;
}

function collectNodesByLevel(
  node: RTreeNode,
  result: Map<number, RTreeNode[]> = new Map(),
): Map<number, RTreeNode[]> {
  if (!result.has(node.level)) result.set(node.level, []);
  result.get(node.level)!.push(node);
  if (!node.isLeaf) {
    for (const child of (node as RTreeInternalNode).children) {
      collectNodesByLevel(child, result);
    }
  }
  return result;
}

export function GraphCanvas({
  graph,
  rtreeRoot,
  highlightNodeIds,
  prunedNodeIds,
  queryRegion,
  resultPointIds,
  queryPoint,
  width,
  height,
  onCanvasClick,
}: Props) {
  const { setHovered, setCursor, hovered } = useHover();

  const nodesByLevel = useMemo(
    () =>
      rtreeRoot
        ? collectNodesByLevel(rtreeRoot)
        : new Map<number, RTreeNode[]>(),
    [rtreeRoot],
  );

  const pointToLeaf = useMemo(() => {
    const map = new Map<string, RTreeNode>();
    if (!rtreeRoot) return map;
    function walk(n: RTreeNode) {
      if (n.isLeaf) {
        for (const p of n.points) map.set(p.id, n);
      } else {
        for (const c of (n as RTreeInternalNode).children) walk(c);
      }
    }
    walk(rtreeRoot);
    return map;
  }, [rtreeRoot]);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onCanvasClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
  }

  const trackCursor = (e: React.MouseEvent) =>
    setCursor({ x: e.clientX, y: e.clientY });

  const enterNode = (node: RTreeNode) =>
    setHovered({ kind: "node", id: node.id });
  const enterPoint = (id: string) => setHovered({ kind: "point", id });
  const leave = () => setHovered(null);

  return (
    <div className="canvas-wrap" style={{ width, height }}>
      <svg
        className="canvas-svg"
        width={width}
        height={height}
        style={{ cursor: onCanvasClick ? "crosshair" : "default" }}
        onClick={handleClick}
        onMouseMove={trackCursor}
        onMouseLeave={leave}
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#eef0f2"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#grid)" />

        {Array.from(nodesByLevel.entries())
          .sort((a, b) => b[0] - a[0])
          .flatMap(([level, nodes]) =>
            nodes.map((node) => {
              const isHighlighted = highlightNodeIds.has(node.id);
              const isPruned = prunedNodeIds.has(node.id);
              const isHovered =
                hovered?.kind === "node" && hovered.id === node.id;

              if (node.isLeaf) {
                const pal = leafPalette(node.id);
                return (
                  <rect
                    key={node.id}
                    x={node.bbox.minX - 2}
                    y={node.bbox.minY - 2}
                    width={node.bbox.maxX - node.bbox.minX + 4}
                    height={node.bbox.maxY - node.bbox.minY + 4}
                    rx={4}
                    fill={
                      isPruned
                        ? "transparent"
                        : isHovered
                          ? pal.fillStrong
                          : pal.fillSoft
                    }
                    stroke={isPruned ? "#d4d4d8" : pal.stroke}
                    strokeWidth={isHovered ? 2.5 : isHighlighted ? 2 : 1.25}
                    strokeOpacity={isPruned ? 0.5 : 1}
                    style={{ transition: "all 120ms ease" }}
                    onMouseEnter={() => enterNode(node)}
                    onMouseLeave={leave}
                  />
                );
              }

              const stroke = neutralStroke(level);
              return (
                <rect
                  key={node.id}
                  x={node.bbox.minX - 4 - level}
                  y={node.bbox.minY - 4 - level}
                  width={node.bbox.maxX - node.bbox.minX + 8 + level * 2}
                  height={node.bbox.maxY - node.bbox.minY + 8 + level * 2}
                  rx={6}
                  fill={isHovered ? "rgba(15,23,42,0.05)" : "transparent"}
                  stroke={isPruned ? "#d4d4d8" : stroke}
                  strokeWidth={isHovered ? 2 : isHighlighted ? 1.5 : 1}
                  strokeOpacity={isPruned ? 0.4 : isHovered ? 1 : 0.7}
                  strokeDasharray="4 4"
                  style={{ transition: "all 120ms ease" }}
                  onMouseEnter={() => enterNode(node)}
                  onMouseLeave={leave}
                />
              );
            }),
          )}

        {queryRegion && (
          <rect
            x={queryRegion.minX}
            y={queryRegion.minY}
            width={queryRegion.maxX - queryRegion.minX}
            height={queryRegion.maxY - queryRegion.minY}
            rx={2}
            fill="rgba(37,99,235,0.06)"
            stroke="#2563eb"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            pointerEvents="none"
          />
        )}

        {graph.edges.map((edge) => {
          const from = graph.points.find((p) => p.id === edge.from)!;
          const to = graph.points.find((p) => p.id === edge.to)!;
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          return (
            <g key={`${edge.from}-${edge.to}`} pointerEvents="none">
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#cbd0d6"
                strokeWidth={1}
              />
              <text
                x={mx}
                y={my}
                fontSize={9}
                fill="#9ca3af"
                textAnchor="middle"
                dy={-2}
              >
                {edge.weight}
              </text>
            </g>
          );
        })}

        {graph.points.map((p) => {
          const isResult = resultPointIds.has(p.id);
          const leaf = pointToLeaf.get(p.id);
          const pal = leaf ? leafPalette(leaf.id) : null;
          const fill = pal ? pal.fillSolid : "#52525b";
          const stroke = pal ? pal.stroke : "#3f3f46";
          const isHoveredPoint =
            hovered?.kind === "point" && hovered.id === p.id;
          const isHoveredLeaf =
            hovered?.kind === "node" && leaf && hovered.id === leaf.id;
          const emphasised = isHoveredPoint || isHoveredLeaf;
          return (
            <g key={p.id}>
              {isResult && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={11}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={2}
                  opacity={0.85}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={emphasised ? 7 : isResult ? 6 : 5}
                fill={fill}
                stroke={emphasised ? "#0f172a" : stroke}
                strokeWidth={emphasised ? 1.75 : 1.25}
                style={{ transition: "all 120ms ease", cursor: "default" }}
                onMouseEnter={() => enterPoint(p.id)}
                onMouseLeave={leave}
              />
              <text
                x={p.x + 8}
                y={p.y - 7}
                fontSize={11}
                fontWeight={emphasised ? 700 : 500}
                fill="#27272a"
                pointerEvents="none"
              >
                {p.label}
              </text>
            </g>
          );
        })}

        {queryPoint && (
          <g pointerEvents="none">
            <circle
              cx={queryPoint.x}
              cy={queryPoint.y}
              r={9}
              fill="none"
              stroke="#2563eb"
              strokeWidth={1.25}
              opacity={0.6}
            />
            <line
              x1={queryPoint.x - 7}
              y1={queryPoint.y}
              x2={queryPoint.x + 7}
              y2={queryPoint.y}
              stroke="#2563eb"
              strokeWidth={1.5}
            />
            <line
              x1={queryPoint.x}
              y1={queryPoint.y - 7}
              x2={queryPoint.x}
              y2={queryPoint.y + 7}
              stroke="#2563eb"
              strokeWidth={1.5}
            />
            <circle cx={queryPoint.x} cy={queryPoint.y} r={2} fill="#2563eb" />
          </g>
        )}
      </svg>
    </div>
  );
}
