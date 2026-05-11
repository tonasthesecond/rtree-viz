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
    <div>
      <table className="compare-table">
        <thead>
          <tr>
            <th />
            <th style={{ textAlign: "right" }}>R-tree</th>
            <th style={{ textAlign: "right" }}>Exhaustive</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nodes / comparisons</td>
            <td className="num">{queryResult.rtreeNodeVisits}</td>
            <td className="num">{exhaustiveResult.comparisons}</td>
          </tr>
          <tr>
            <td>Results found</td>
            <td className="num">{queryResult.resultPointIds.length}</td>
            <td className="num">{exhaustiveResult.resultPointIds.length}</td>
          </tr>
        </tbody>
      </table>
      <p className="compare-summary">
        R-tree visited <strong>{ratio}×</strong> the work of exhaustive (
        {queryResult.rtreeNodeVisits} vs {exhaustiveResult.comparisons}).
      </p>
    </div>
  );
}
