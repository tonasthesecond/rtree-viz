# rtree-viz

React + TypeScript R-tree visualizer built with Vite.

## What this is
Step-by-step educational tool showing R-tree construction and querying on a random spatial graph. Four phases: graph generation → construction walkthrough → query selection → comparison vs exhaustive search.

## Stack
- Vite + React + TypeScript (no extra deps beyond defaults)
- SVG for all visualization (GraphCanvas.tsx)
- No CSS framework

## Key files
- `src/lib/rtreeConstruct.ts` — insertion algorithm with step recording (MAX_ENTRIES=4, quadratic split)
- `src/lib/rtreeQuery.ts` — range, KNN (best-first), and point queries with step recording
- `src/lib/exhaustiveSearch.ts` — brute-force comparison baseline
- `src/components/GraphCanvas.tsx` — SVG canvas: graph edges/nodes + bounding boxes by level
- `src/App.tsx` — phase state machine (graph → construct → query → compare)

## Conventions
- Step descriptions are dynamic — reference actual node IDs, point labels, and computed values
- No hardcoded spatial data; everything derives from the generated graph
- Types live in src/types/, pure logic in src/lib/, React in src/components/

## Current tasks
- GitHub Pages deployment (set base in vite.config.ts, push to gh-pages branch)
- CSS polish (layout, colors, step panels)
- Hover-to-reveal coordinates in step descriptions (replace raw numbers with hover spans)
