import { useState } from "react";
import type { QueryParams, QueryType } from "../types/rtree";
import type { Point } from "../types/geometry";

interface Props {
  points: Point[];
  pendingQueryPoint: { x: number; y: number } | null;
  onRun: (params: QueryParams) => void;
}

const QUERY_LABELS: Record<QueryType, string> = {
  range: "Range (rectangle)",
  knn: "K-Nearest Neighbors",
  point: "Point lookup",
};

export function QuerySelector({ points, pendingQueryPoint, onRun }: Props) {
  const [queryType, setQueryType] = useState<QueryType>("range");
  const [minX, setMinX] = useState(100);
  const [minY, setMinY] = useState(100);
  const [maxX, setMaxX] = useState(400);
  const [maxY, setMaxY] = useState(400);
  const [k, setK] = useState(3);
  const [selectedPointId, setSelectedPointId] = useState(points[0]?.id ?? "");

  function handleRun() {
    if (queryType === "range") {
      onRun({ type: "range", minX, minY, maxX, maxY });
    } else if (queryType === "knn") {
      const qp = pendingQueryPoint ?? { x: 300, y: 250 };
      onRun({ type: "knn", x: qp.x, y: qp.y, k });
    } else {
      onRun({ type: "point", pointId: selectedPointId });
    }
  }

  return (
    <div>
      <div className="radio-row">
        {(Object.keys(QUERY_LABELS) as QueryType[]).map((t) => (
          <label key={t}>
            <input
              type="radio"
              value={t}
              checked={queryType === t}
              onChange={() => setQueryType(t)}
            />
            {QUERY_LABELS[t]}
          </label>
        ))}
      </div>

      {queryType === "range" && (
        <div className="field-grid" style={{ marginBottom: 12 }}>
          <label>
            minX
            <input
              type="number"
              value={minX}
              onChange={(e) => setMinX(+e.target.value)}
            />
          </label>
          <label>
            minY
            <input
              type="number"
              value={minY}
              onChange={(e) => setMinY(+e.target.value)}
            />
          </label>
          <label>
            maxX
            <input
              type="number"
              value={maxX}
              onChange={(e) => setMaxX(+e.target.value)}
            />
          </label>
          <label>
            maxY
            <input
              type="number"
              value={maxY}
              onChange={(e) => setMaxY(+e.target.value)}
            />
          </label>
        </div>
      )}

      {queryType === "knn" && (
        <div style={{ marginBottom: 12 }}>
          <label className="field" style={{ marginRight: 12 }}>
            k
            <input
              type="number"
              value={k}
              min={1}
              max={points.length}
              onChange={(e) => setK(+e.target.value)}
              style={{ width: 60 }}
            />
          </label>
          <span className="hint">
            {pendingQueryPoint
              ? `Query point: (${pendingQueryPoint.x.toFixed(1)}, ${pendingQueryPoint.y.toFixed(1)})`
              : "Click the canvas to set query point"}
          </span>
        </div>
      )}

      {queryType === "point" && (
        <div style={{ marginBottom: 12 }}>
          <label className="field">
            Point
            <select
              value={selectedPointId}
              onChange={(e) => setSelectedPointId(e.target.value)}
            >
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.x.toFixed(1)}, {p.y.toFixed(1)})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <button className="primary" onClick={handleRun}>
        Run query
      </button>
    </div>
  );
}
