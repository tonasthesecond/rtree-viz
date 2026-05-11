import type { QueryResult } from "../types/rtree";

interface Props {
  result: QueryResult;
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function QueryGuide({ result, currentStep, onStepChange }: Props) {
  const step = result.steps[currentStep];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <button
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          ←
        </button>
        <span>
          Step {currentStep + 1} / {result.steps.length}
        </span>
        <button
          onClick={() =>
            onStepChange(Math.min(result.steps.length - 1, currentStep + 1))
          }
          disabled={currentStep === result.steps.length - 1}
        >
          →
        </button>
        <button onClick={() => onStepChange(result.steps.length - 1)}>
          Skip to end
        </button>
      </div>

      {step && (
        <div>
          <strong>{step.label}</strong>
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {step.descriptionLines.map((line, i) => (
              <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                {line}
              </li>
            ))}
          </ul>
          {step.prunedNodeIds.length > 0 && (
            <p style={{ fontSize: 13, color: "#888", margin: "4px 0" }}>
              ✗ Pruned: {step.prunedNodeIds.join(", ")}
            </p>
          )}
          {step.resultPointIds.length > 0 && (
            <p style={{ fontSize: 13, color: "#27ae60", margin: "4px 0" }}>
              ✓ Current results: [{step.resultPointIds.join(", ")}]
            </p>
          )}
        </div>
      )}
    </div>
  );
}
