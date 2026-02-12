import type { SyncState } from "../types";

interface SyncBadgeProps {
  state: SyncState;
}

const stateClassName: Record<SyncState, string> = {
  LOCAL_ONLY: "bg-amber-100 text-amber-700 ring-amber-200",
  SYNCING: "bg-sky-100 text-sky-700 ring-sky-200",
  SYNCED: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  FAILED: "bg-rose-100 text-rose-700 ring-rose-200",
};

export default function SyncBadge({ state }: SyncBadgeProps) {
  return (
    <span className={`ui-pill ring-1 ${stateClassName[state]}`}>
      {state}
    </span>
  );
}
