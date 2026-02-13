interface EnrollmentCaptureProgressPanelProps {
  descriptorsCount: number;
  captureTarget: number;
  capturePercent: number;
  currentHint: string;
  captureHint: string;
  className?: string;
  dark?: boolean;
}

export default function EnrollmentCaptureProgressPanel({
  descriptorsCount,
  captureTarget,
  capturePercent,
  currentHint,
  captureHint,
  className,
  dark = false,
}: EnrollmentCaptureProgressPanelProps) {
  return (
    <section className={className ?? "ui-card p-4"}>
      <div className="mb-2 flex items-center justify-between text-xs font-medium">
        <span className={dark ? "text-[11px] font-semibold text-white/80" : "ui-note-xs"}>Progress</span>
        <span className={dark ? "text-xs font-semibold text-white" : "ui-title text-xs"}>
          {descriptorsCount}/{captureTarget}
        </span>
      </div>
      <div className="ui-progress-track">
        <div className="ui-progress-bar" style={{ width: `${capturePercent}%` }} />
      </div>
      <p className={dark ? "mt-1 text-[11px] font-semibold text-white/75" : "ui-note-xs mt-1"}>
        {capturePercent}% completed
      </p>
      <p className={dark ? "mt-3 text-[11px] font-semibold uppercase tracking-wide text-white/70" : "ui-kicker mt-3"}>
        Current Prompt: {currentHint}
      </p>
      <p className={dark ? "mt-1 text-xs font-medium text-white/90" : "ui-note-xs mt-1"}>{captureHint}</p>
    </section>
  );
}
