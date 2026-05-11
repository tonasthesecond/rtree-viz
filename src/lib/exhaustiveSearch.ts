import type { Point } from "../types/geometry";
import type { QueryParams } from "../types/rtree";
import { euclidean } from "./bbox";

export interface ExhaustiveResult {
  resultPointIds: string[];
  comparisons: number;
  timeMs: number;
}

export function exhaustiveSearch(
  points: Point[],
  params: QueryParams,
): ExhaustiveResult {
  const t0 = performance.now();
  let comparisons = 0;
  let resultPointIds: string[] = [];

  if (params.type === "range") {
    for (const p of points) {
      comparisons++;
      if (
        p.x >= params.minX &&
        p.x <= params.maxX &&
        p.y >= params.minY &&
        p.y <= params.maxY
      ) {
        resultPointIds.push(p.id);
      }
    }
  } else if (params.type === "knn") {
    const { x, y, k } = params;
    const ranked = points.map((p) => {
      comparisons++;
      return { id: p.id, dist: euclidean(p.x, p.y, x, y) };
    });
    ranked.sort((a, b) => a.dist - b.dist);
    resultPointIds = ranked.slice(0, k).map((d) => d.id);
  } else {
    for (const p of points) {
      comparisons++;
      if (p.id === params.pointId) {
        resultPointIds.push(p.id);
        break;
      }
    }
  }

  return { resultPointIds, comparisons, timeMs: performance.now() - t0 };
}
