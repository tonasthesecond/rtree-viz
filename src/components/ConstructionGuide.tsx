import type { InsertionRecord } from "../types/rtree";

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
          Insertion {currentStep + 1} / {records.length}
        </span>
        <button
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
        <div>
          <strong>
            Inserting: {record.point.label} ({record.point.x.toFixed(1)},{" "}
            {record.point.y.toFixed(1)})
          </strong>
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {record.descriptionLines.map((line, i) => (
              <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                {line}
              </li>
            ))}
          </ul>
          {record.rootGrew && (
            <p style={{ color: "#c0392b", fontWeight: "bold", marginTop: 6 }}>
              ↑ Root split — tree grew taller
            </p>
          )}
        </div>
      )}
    </div>
  );
}
