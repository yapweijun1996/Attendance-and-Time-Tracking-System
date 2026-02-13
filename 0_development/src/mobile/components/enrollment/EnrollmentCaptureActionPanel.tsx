interface EnrollmentCaptureActionPanelProps {
  canContinue: boolean;
  minRequiredDiffPercent: number;
  lastMinDiffPercent: number | null;
  hintClassName?: string;
  onReset: () => void;
  onContinue: () => void;
}

export default function EnrollmentCaptureActionPanel({
  canContinue,
  minRequiredDiffPercent,
  lastMinDiffPercent,
  hintClassName,
  onReset,
  onContinue,
}: EnrollmentCaptureActionPanelProps) {
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={onReset} className="ui-btn ui-btn-ghost min-h-0">
          Reset
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="ui-btn ui-btn-success min-h-0 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Continue
        </button>
      </div>
      <p className={hintClassName ?? "ui-note-xs mt-2"}>
        Min required difference per capture: {minRequiredDiffPercent}%.
        {lastMinDiffPercent !== null ? ` Last min difference: ${lastMinDiffPercent.toFixed(2)}%.` : ""}
      </p>
    </>
  );
}
