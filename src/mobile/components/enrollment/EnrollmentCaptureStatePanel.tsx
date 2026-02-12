import type {
  CaptureDiagnostics,
  CaptureFlowState,
  CaptureSignalLevel,
} from "../../services/enrollment-capture";

interface EnrollmentCaptureStatePanelProps {
  state: CaptureFlowState;
  diagnostics: CaptureDiagnostics;
  className?: string;
  dark?: boolean;
}

const stateSteps: Array<{ key: CaptureFlowState; label: string }> = [
  { key: "SCANNING", label: "Scanning" },
  { key: "LOW_CONFIDENCE", label: "Low Confidence" },
  { key: "TOO_SIMILAR", label: "Too Similar" },
  { key: "CAPTURED", label: "Captured" },
];

function signalClass(level: CaptureSignalLevel): string {
  if (level === "GOOD") {
    return "text-emerald-700";
  }
  if (level === "WARN") {
    return "text-amber-700";
  }
  return "text-red-700";
}

export default function EnrollmentCaptureStatePanel({
  state,
  diagnostics,
  className,
  dark = false,
}: EnrollmentCaptureStatePanelProps) {
  const activeState = state === "COMPLETED" ? "CAPTURED" : state;
  return (
    <section className={className ?? "ui-card p-4"}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={dark ? "text-[11px] font-semibold uppercase tracking-wider text-white/75" : "ui-kicker mb-0"}>
          Auto Capture State
        </h2>
        <span className={dark ? "text-[11px] font-semibold text-white/80" : "ui-note-xs"}>{activeState}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stateSteps.map((step) => {
          const active = step.key === activeState;
          return (
            <div
              key={step.key}
              className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold ${
                active
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {step.label}
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5 text-xs font-medium">
        <p className={signalClass(diagnostics.lightLevel)}>{diagnostics.lightMessage}</p>
        <p className={signalClass(diagnostics.distanceLevel)}>{diagnostics.distanceMessage}</p>
      </div>
    </section>
  );
}
