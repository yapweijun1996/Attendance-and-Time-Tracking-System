import type { AttendanceAction } from "../types";

interface ActionButtonPairProps {
  disabled: boolean;
  onAction: (action: AttendanceAction) => void;
}

export default function ActionButtonPair({ disabled, onAction }: ActionButtonPairProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onAction("IN")}
        disabled={disabled}
        className="ui-btn ui-btn-success h-14 w-full rounded-xl text-base disabled:cursor-not-allowed disabled:opacity-50"
      >
        Time In
      </button>
      <button
        type="button"
        onClick={() => onAction("OUT")}
        disabled={disabled}
        className="ui-btn ui-btn-danger h-14 w-full rounded-xl text-base disabled:cursor-not-allowed disabled:opacity-50"
      >
        Time Out
      </button>
    </div>
  );
}
