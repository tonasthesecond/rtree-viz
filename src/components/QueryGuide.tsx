import type { QueryResult } from "../types/rtree";
import { RichText } from "./RichText";
import { useHover } from "./HoverContext";

interface Props {
  result: QueryResult;
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function QueryGuide({ result, currentStep, onStepChange }: Props) {
  const { graph } = useHover();
  const step = result.steps[currentStep];
  const idToLabel = new Map(graph.points.map((p) => [p.id, p.label]));
  const labelsFor = (ids: string[]) =>
    ids.map((id) => idToLabel.get(id) ?? id).join(", ");

  return (
    <div>
      <div className="step-nav">
        <button
          className="icon"
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          ←
        </button>
        <span className="step-counter">
          Step{" "}
          <strong>
            {currentStep + 1} / {result.steps.length}
          </strong>
        </span>
        <button
          className="icon"
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
        <div className="step-body">
          <div className="step-title">
            <RichText text={step.label} />
          </div>
          <ul>
            {step.descriptionLines.map((line, i) => (
              <li key={i}>
                <RichText text={line} />
              </li>
            ))}
          </ul>
          {step.prunedNodeIds.length > 0 && (
            <div className="step-note muted">
              Pruned: <RichText text={step.prunedNodeIds.join(", ")} />
            </div>
          )}
          {step.resultPointIds.length > 0 && (
            <div className="step-note good">
              Current results: [
              <RichText text={labelsFor(step.resultPointIds)} />]
            </div>
          )}
        </div>
      )}
    </div>
  );
}
