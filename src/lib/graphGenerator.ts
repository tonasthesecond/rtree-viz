import type { Graph, Point, Edge } from "../types/geometry";
import { euclidean } from "./bbox";

export function generateGraph(
  pointCount: number,
  width: number,
  height: number,
  edgeProbability = 0.3,
): Graph {
  const pad = 40;
  const points: Point[] = Array.from({ length: pointCount }, (_, i) => ({
    id: `p${i}`,
    x: pad + Math.random() * (width - pad * 2),
    y: pad + Math.random() * (height - pad * 2),
    label:
      i < 26
        ? String.fromCharCode(65 + i)
        : String.fromCharCode(65 + (i % 26)) + String(Math.floor(i / 26)),
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (Math.random() < edgeProbability) {
        edges.push({
          from: points[i].id,
          to: points[j].id,
          weight:
            Math.round(
              euclidean(points[i].x, points[i].y, points[j].x, points[j].y) *
                10,
            ) / 10,
        });
      }
    }
  }

  return { points, edges };
}
