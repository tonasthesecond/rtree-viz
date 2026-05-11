import type { Graph, BoundingBox } from "../types/geometry";
import type { RTreeNode, RTreeInternalNode } from "../types/rtree";

const LEVEL_COLORS = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
];

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
  const nodesByLevel = rtreeRoot
    ? collectNodesByLevel(rtreeRoot)
    : new Map<number, RTreeNode[]>();

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onCanvasClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
  }

  return (
    <svg
      width={width}
      height={height}
      style={{
        border: "1px solid #ccc",
        background: "#fafafa",
        cursor: onCanvasClick ? "crosshair" : "default",
        display: "block",
      }}
      onClick={handleClick}
    >
      {Array.from(nodesByLevel.entries())
        .sort((a, b) => b[0] - a[0])
        .flatMap(([level, nodes]) =>
          nodes.map((node) => {
            const color = LEVEL_COLORS[level % LEVEL_COLORS.length];
            const isHighlighted = highlightNodeIds.has(node.id);
            const isPruned = prunedNodeIds.has(node.id);
            return (
              <rect
                key={node.id}
                x={node.bbox.minX}
                y={node.bbox.minY}
                width={node.bbox.maxX - node.bbox.minX}
                height={node.bbox.maxY - node.bbox.minY}
                fill={color}
                fillOpacity={isPruned ? 0.05 : isHighlighted ? 0.35 : 0.12}
                stroke={isPruned ? "#bbb" : color}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeDasharray={node.isLeaf ? undefined : "5 3"}
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
          fill="rgba(0,80,255,0.05)"
          stroke="blue"
          strokeWidth={1.5}
          strokeDasharray="6 3"
        />
      )}

      {graph.edges.map((edge) => {
        const from = graph.points.find((p) => p.id === edge.from)!;
        const to = graph.points.find((p) => p.id === edge.to)!;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#ccc"
              strokeWidth={1}
            />
            <text x={mx} y={my} fontSize={9} fill="#aaa" textAnchor="middle">
              {edge.weight}
            </text>
          </g>
        );
      })}

      {graph.points.map((p) => {
        const isResult = resultPointIds.has(p.id);
        return (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isResult ? 7 : 5}
              fill={isResult ? "#e74c3c" : "#333"}
              stroke={isResult ? "#c0392b" : "none"}
              strokeWidth={2}
            />
            <text x={p.x + 8} y={p.y - 6} fontSize={11} fill="#444">
              {p.label}
            </text>
          </g>
        );
      })}

      {queryPoint && (
        <g>
          <line
            x1={queryPoint.x - 10}
            y1={queryPoint.y}
            x2={queryPoint.x + 10}
            y2={queryPoint.y}
            stroke="blue"
            strokeWidth={1.5}
          />
          <line
            x1={queryPoint.x}
            y1={queryPoint.y - 10}
            x2={queryPoint.x}
            y2={queryPoint.y + 10}
            stroke="blue"
            strokeWidth={1.5}
          />
          <circle
            cx={queryPoint.x}
            cy={queryPoint.y}
            r={4}
            fill="blue"
            opacity={0.6}
          />
        </g>
      )}
    </svg>
  );
}
