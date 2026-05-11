import type { BoundingBox, Point } from "../types/geometry";

export function bboxFromPoints(points: Point[]): BoundingBox {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

export function mergeBboxes(a: BoundingBox, b: BoundingBox): BoundingBox {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function bboxArea(b: BoundingBox): number {
  return (b.maxX - b.minX) * (b.maxY - b.minY);
}

export function bboxEnlargement(
  existing: BoundingBox,
  adding: BoundingBox,
): number {
  return bboxArea(mergeBboxes(existing, adding)) - bboxArea(existing);
}

export function bboxIntersects(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

export function bboxContainsPoint(
  b: BoundingBox,
  x: number,
  y: number,
): boolean {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

export function minDistPointToBbox(
  b: BoundingBox,
  x: number,
  y: number,
): number {
  const dx = Math.max(b.minX - x, 0, x - b.maxX);
  const dy = Math.max(b.minY - y, 0, y - b.maxY);
  return Math.sqrt(dx * dx + dy * dy);
}

export function euclidean(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

export function pointBbox(p: Point): BoundingBox {
  return { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
}
