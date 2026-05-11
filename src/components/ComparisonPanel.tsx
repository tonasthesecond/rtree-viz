import type { QueryResult } from "../types/rtree";
import type { ExhaustiveResult } from "../lib/exhaustiveSearch";

interface Props {
  queryResult: QueryResult;
  exhaustiveResult: ExhaustiveResult;
}

export function ComparisonPanel({ queryResult, exhaustiveResult }: Props) {
  const ratio =
    exhaustiveResult.comparisons > 0
      ? (queryResult.rtreeNodeVisits / exhaustiveResult.comparisons).toFixed(2)
      : "—";

  return (
    <div style={{ marginTop: 16 }}>
      <strong>R-tree vs Exhaustive Search</strong>
      <table
        style={{
          borderCollapse: "collapse",
          fontSize: 13,
          marginTop: 8,
          width: "100%",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "3px 10px",
                borderBottom: "1px solid #ccc",
              }}
            />
            <th style={{ padding: "3px 10px", borderBottom: "1px solid #ccc" }}>
              R-tree
            </th>
            <th style={{ padding: "3px 10px", borderBottom: "1px solid #ccc" }}>
              Exhaustive
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "3px 10px" }}>Nodes / comparisons visited</td>
            <td style={{ textAlign: "center", padding: "3px 10px" }}>
              {queryResult.rtreeNodeVisits}
            </td>
            <td style={{ textAlign: "center", padding: "3px 10px" }}>
              {exhaustiveResult.comparisons}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 10px" }}>Time (ms)</td>
            <td style={{ textAlign: "center", padding: "3px 10px" }}>
              {queryResult.rtreeTimeMs.toFixed(3)}
            </td>
            <td style={{ textAlign: "center", padding: "3px 10px" }}>
              {exhaustiveResult.timeMs.toFixed(3)}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 10px" }}>Results found</td>
            <td style={{ textAlign: "center", padding: "3px 10px" }}>
              {queryResult.resultPointIds.length}
            </td>
            <td style={{ textAlign: "center", padding: "3px 10px" }}>
              {exhaustiveResult.resultPointIds.length}
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
        R-tree visited {ratio}× the work of exhaustive (
        {queryResult.rtreeNodeVisits} vs {exhaustiveResult.comparisons}{" "}
        comparisons).
      </p>
    </div>
  );
}
