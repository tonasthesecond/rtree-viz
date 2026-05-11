import { useState } from "react";
import type { QueryParams, QueryType } from "../types/rtree";
import type { Point } from "../types/geometry";

interface Props {
  points: Point[];
  pendingQueryPoint: { x: number; y: number } | null;
  onRun: (params: QueryParams) => void;
}

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
      <div style={{ marginBottom: 10 }}>
        {(["range", "knn", "point"] as QueryType[]).map((t) => (
          <label key={t} style={{ marginRight: 14 }}>
            <input
              type="radio"
              value={t}
              checked={queryType === t}
              onChange={() => setQueryType(t)}
            />{" "}
            {t === "range"
              ? "Range (rectangle)"
              : t === "knn"
                ? "K-Nearest Neighbors"
                : "Point lookup"}
          </label>
        ))}
      </div>

      {queryType === "range" && (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <label>
            minX{" "}
            <input
              type="number"
              value={minX}
              onChange={(e) => setMinX(+e.target.value)}
              style={{ width: 60 }}
            />
          </label>
          <label>
            minY{" "}
            <input
              type="number"
              value={minY}
              onChange={(e) => setMinY(+e.target.value)}
              style={{ width: 60 }}
            />
          </label>
          <label>
            maxX{" "}
            <input
              type="number"
              value={maxX}
              onChange={(e) => setMaxX(+e.target.value)}
              style={{ width: 60 }}
            />
          </label>
          <label>
            maxY{" "}
            <input
              type="number"
              value={maxY}
              onChange={(e) => setMaxY(+e.target.value)}
              style={{ width: 60 }}
            />
          </label>
        </div>
      )}

      {queryType === "knn" && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <label>
            k{" "}
            <input
              type="number"
              value={k}
              min={1}
              max={points.length}
              onChange={(e) => setK(+e.target.value)}
              style={{ width: 50 }}
            />
          </label>
          <span style={{ fontSize: 13, color: "#666" }}>
            {pendingQueryPoint
              ? `Query point: (${pendingQueryPoint.x.toFixed(1)}, ${pendingQueryPoint.y.toFixed(1)})`
              : "Click the canvas to set query point"}
          </span>
        </div>
      )}

      {queryType === "point" && (
        <div style={{ marginBottom: 10 }}>
          <label>
            Point{" "}
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

      <button onClick={handleRun}>Run Query</button>
    </div>
  );
}
