import { useState } from "react";
import type { Graph, BoundingBox } from "./types/geometry";
import type {
  RTreeNode,
  InsertionRecord,
  QueryResult,
  QueryParams,
} from "./types/rtree";
import { generateGraph } from "./lib/graphGenerator";
import { buildRTree } from "./lib/rtreeConstruct";
import { runQuery } from "./lib/rtreeQuery";
import { exhaustiveSearch } from "./lib/exhaustiveSearch";
import type { ExhaustiveResult } from "./lib/exhaustiveSearch";
import { GraphCanvas } from "./components/GraphCanvas";
import { ConstructionGuide } from "./components/ConstructionGuide";
import { QuerySelector } from "./components/QuerySelector";
import { QueryGuide } from "./components/QueryGuide";
import { ComparisonPanel } from "./components/ComparisonPanel";

type Phase = "graph" | "construct" | "query" | "compare";

const CANVAS_W = 600;
const CANVAS_H = 500;

export default function App() {
  const [phase, setPhase] = useState<Phase>("graph");
  const [pointCount, setPointCount] = useState(12);
  const [graph, setGraph] = useState<Graph>(() =>
    generateGraph(12, CANVAS_W, CANVAS_H),
  );
  const [rtreeRoot, setRtreeRoot] = useState<RTreeNode | null>(null);
  const [records, setRecords] = useState<InsertionRecord[]>([]);
  const [constructionStep, setConstructionStep] = useState(0);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryStep, setQueryStep] = useState(0);
  const [exhaustiveResult, setExhaustiveResult] =
    useState<ExhaustiveResult | null>(null);
  const [pendingQueryPoint, setPendingQueryPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activeQueryParams, setActiveQueryParams] =
    useState<QueryParams | null>(null);

  function handleRegenerate() {
    const g = generateGraph(pointCount, CANVAS_W, CANVAS_H);
    setGraph(g);
    setRtreeRoot(null);
    setRecords([]);
    setConstructionStep(0);
    setQueryResult(null);
    setExhaustiveResult(null);
    setActiveQueryParams(null);
    setPendingQueryPoint(null);
    setPhase("graph");
  }

  function handleBuildRTree() {
    const result = buildRTree(graph.points);
    setRtreeRoot(result.root);
    setRecords(result.records);
    setConstructionStep(0);
    setPhase("construct");
  }

  function handleRunQuery(params: QueryParams) {
    if (!rtreeRoot) return;
    const qr = runQuery(rtreeRoot, params, graph.points);
    const er = exhaustiveSearch(graph.points, params);
    setQueryResult(qr);
    setExhaustiveResult(er);
    setQueryStep(0);
    setActiveQueryParams(params);
    setPhase("compare");
  }

  function handleCanvasClick(x: number, y: number) {
    if (phase === "query") setPendingQueryPoint({ x, y });
  }

  const highlightNodeIds = new Set<string>();
  const prunedNodeIds = new Set<string>();
  const resultPointIds = new Set<string>();
  let displayRoot: RTreeNode | null = rtreeRoot;
  let queryRegion: BoundingBox | null = null;
  let queryPoint: { x: number; y: number } | null = null;

  if (phase === "construct" && records.length > 0) {
    const rec = records[constructionStep];
    displayRoot = rec.snapshotAfter;
    rec.pathNodeIds.forEach((id) => highlightNodeIds.add(id));
    rec.splitNodeIds.forEach((id) => highlightNodeIds.add(id));
  }

  if (
    (phase === "compare" || phase === "query") &&
    queryResult &&
    queryResult.steps.length > 0
  ) {
    const step =
      queryResult.steps[Math.min(queryStep, queryResult.steps.length - 1)];
    step.visitedNodeIds.forEach((id) => highlightNodeIds.add(id));
    step.prunedNodeIds.forEach((id) => prunedNodeIds.add(id));
    step.resultPointIds.forEach((id) => resultPointIds.add(id));
  }

  if (activeQueryParams?.type === "range") {
    queryRegion = {
      minX: activeQueryParams.minX,
      minY: activeQueryParams.minY,
      maxX: activeQueryParams.maxX,
      maxY: activeQueryParams.maxY,
    };
  }

  if (activeQueryParams?.type === "knn") {
    queryPoint = { x: activeQueryParams.x, y: activeQueryParams.y };
  }

  if (phase === "query" && pendingQueryPoint) {
    queryPoint = pendingQueryPoint;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        padding: 24,
        fontFamily: "sans-serif",
      }}
    >
      <div>
        <GraphCanvas
          graph={graph}
          rtreeRoot={displayRoot}
          highlightNodeIds={highlightNodeIds}
          prunedNodeIds={prunedNodeIds}
          queryRegion={queryRegion}
          resultPointIds={resultPointIds}
          queryPoint={queryPoint}
          width={CANVAS_W}
          height={CANVAS_H}
          onCanvasClick={phase === "query" ? handleCanvasClick : undefined}
        />
      </div>

      <div style={{ flex: 1, maxWidth: 440 }}>
        <h2 style={{ marginTop: 0 }}>R-tree Visualizer</h2>

        {phase === "graph" && (
          <div>
            <h3>1. Generate Graph</h3>
            <label>
              Points:{" "}
              <input
                type="number"
                value={pointCount}
                min={4}
                max={26}
                onChange={(e) => setPointCount(+e.target.value)}
                style={{ width: 55 }}
              />
            </label>
            <br />
            <br />
            <button onClick={handleRegenerate} style={{ marginRight: 8 }}>
              Regenerate
            </button>
            <button onClick={handleBuildRTree}>Build R-tree →</button>
          </div>
        )}

        {phase === "construct" && (
          <div>
            <h3>2. R-tree Construction</h3>
            <ConstructionGuide
              records={records}
              currentStep={constructionStep}
              onStepChange={setConstructionStep}
            />
            <br />
            <button
              onClick={() => setPhase("graph")}
              style={{ marginRight: 8 }}
            >
              ← Back
            </button>
            <button onClick={() => setPhase("query")}>Choose Query →</button>
          </div>
        )}

        {phase === "query" && rtreeRoot && (
          <div>
            <h3>3. Query</h3>
            <QuerySelector
              points={graph.points}
              pendingQueryPoint={pendingQueryPoint}
              onRun={handleRunQuery}
            />
            <br />
            <button
              onClick={() => {
                setPhase("construct");
                setPendingQueryPoint(null);
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {phase === "compare" && queryResult && exhaustiveResult && (
          <div>
            <h3>4. Query Steps</h3>
            <QueryGuide
              result={queryResult}
              currentStep={queryStep}
              onStepChange={setQueryStep}
            />
            <ComparisonPanel
              queryResult={queryResult}
              exhaustiveResult={exhaustiveResult}
            />
            <br />
            <button
              onClick={() => {
                setPhase("query");
                setQueryResult(null);
                setActiveQueryParams(null);
              }}
              style={{ marginRight: 8 }}
            >
              ← New Query
            </button>
            <button onClick={handleRegenerate}>Regenerate Graph</button>
          </div>
        )}
      </div>
    </div>
  );
}
