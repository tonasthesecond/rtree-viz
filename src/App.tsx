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
import { HoverProvider } from "./components/HoverContext";

type Phase = "graph" | "construct" | "query" | "compare";

const CANVAS_W = 600;
const CANVAS_H = 500;

const PHASES: Array<{ id: Phase; label: string }> = [
  { id: "graph", label: "1. Graph" },
  { id: "construct", label: "2. Build" },
  { id: "query", label: "3. Query" },
  { id: "compare", label: "4. Compare" },
];

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
    <HoverProvider graph={graph} rtreeRoot={displayRoot}>
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <h1>R-tree Visualizer</h1>
          <small>step-through construction and querying</small>
        </div>
        <div className="phase-strip">
          {PHASES.map((p) => (
            <span
              key={p.id}
              className={`phase-chip ${phase === p.id ? "active" : ""}`}
            >
              {p.label}
            </span>
          ))}
        </div>
      </header>

      <main className="layout">
        <div className="card">
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

        <div className="card panel">
          {phase === "graph" && (
            <section>
              <div className="section-header">
                <h3>Generate graph</h3>
              </div>
              <div className="btn-row" style={{ alignItems: "center" }}>
                <label className="field">
                  Points
                  <input
                    type="number"
                    value={pointCount}
                    min={4}
                    max={26}
                    onChange={(e) => setPointCount(+e.target.value)}
                    style={{ width: 60 }}
                  />
                </label>
                <button onClick={handleRegenerate}>Regenerate</button>
                <button className="primary" onClick={handleBuildRTree}>
                  Build R-tree →
                </button>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                Hover any node or point in the canvas to inspect its role in
                the tree.
              </p>
            </section>
          )}

          {phase === "construct" && (
            <section>
              <div className="section-header">
                <h3>R-tree construction</h3>
              </div>
              <ConstructionGuide
                records={records}
                currentStep={constructionStep}
                onStepChange={setConstructionStep}
              />
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button onClick={() => setPhase("graph")}>← Back</button>
                <button className="primary" onClick={() => setPhase("query")}>
                  Choose query →
                </button>
              </div>
            </section>
          )}

          {phase === "query" && rtreeRoot && (
            <section>
              <div className="section-header">
                <h3>Configure query</h3>
              </div>
              <QuerySelector
                points={graph.points}
                pendingQueryPoint={pendingQueryPoint}
                onRun={handleRunQuery}
              />
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button
                  onClick={() => {
                    setPhase("construct");
                    setPendingQueryPoint(null);
                  }}
                >
                  ← Back
                </button>
              </div>
            </section>
          )}

          {phase === "compare" && queryResult && exhaustiveResult && (
            <>
              <section>
                <div className="section-header">
                  <h3>Query steps</h3>
                </div>
                <QueryGuide
                  result={queryResult}
                  currentStep={queryStep}
                  onStepChange={setQueryStep}
                />
              </section>
              <section>
                <div className="section-header">
                  <h3>R-tree vs exhaustive</h3>
                </div>
                <ComparisonPanel
                  queryResult={queryResult}
                  exhaustiveResult={exhaustiveResult}
                />
              </section>
              <section>
                <div className="btn-row">
                  <button
                    onClick={() => {
                      setPhase("query");
                      setQueryResult(null);
                      setActiveQueryParams(null);
                    }}
                  >
                    ← New query
                  </button>
                  <button onClick={handleRegenerate}>Regenerate graph</button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
    </HoverProvider>
  );
}
