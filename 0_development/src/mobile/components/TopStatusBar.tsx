import SyncBadge from "./SyncBadge";
import type { SyncState } from "../types";

interface TopStatusBarProps {
  dbReady: boolean;
  online: boolean;
  syncState: SyncState;
}

export default function TopStatusBar({ dbReady, online, syncState }: TopStatusBarProps) {
  return (
    <div className="ui-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="ui-kicker">Network</p>
          <p className={`text-sm font-semibold ${online ? "text-emerald-700" : "text-amber-700"}`}>
            {online ? "Online" : "Offline"}
          </p>
        </div>
        <div>
          <p className="ui-kicker">Local DB</p>
          <p className={`text-sm font-semibold ${dbReady ? "text-emerald-700" : "text-slate-600"}`}>
            {dbReady ? "Ready" : "Initializing"}
          </p>
        </div>
        <div className="text-right">
          <p className="ui-kicker mb-1">Sync</p>
          <SyncBadge state={syncState} />
        </div>
      </div>
    </div>
  );
}
