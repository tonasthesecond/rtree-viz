export interface Point {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface Edge {
  from: string;
  to: string;
  weight: number;
}

export interface Graph {
  points: Point[];
  edges: Edge[];
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
