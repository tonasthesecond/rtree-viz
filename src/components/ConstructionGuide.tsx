import type { InsertionRecord } from "../types/rtree";
import { RichText } from "./RichText";

interface Props {
  records: InsertionRecord[];
  currentStep: number;
  onStepChange: (step: number) => void;
}

export function ConstructionGuide({
  records,
  currentStep,
  onStepChange,
}: Props) {
  const record = records[currentStep];

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
          Insertion{" "}
          <strong>
            {currentStep + 1} / {records.length}
          </strong>
        </span>
        <button
          className="icon"
          onClick={() =>
            onStepChange(Math.min(records.length - 1, currentStep + 1))
          }
          disabled={currentStep === records.length - 1}
        >
          →
        </button>
        <button onClick={() => onStepChange(records.length - 1)}>
          Skip to end
        </button>
      </div>

      {record && (
        <div className="step-body">
          <div className="step-title">
            Inserting point <RichText text={record.point.label} />
          </div>
          <ul>
            {record.descriptionLines.map((line, i) => (
              <li key={i}>
                <RichText text={line} />
              </li>
            ))}
          </ul>
          {record.rootGrew && (
            <div className="step-note warn">
              ↑ Root split — tree grew taller
            </div>
          )}
        </div>
      )}
    </div>
  );
}
