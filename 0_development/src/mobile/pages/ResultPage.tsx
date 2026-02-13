import MobileTabBar from "../components/MobileTabBar";
import SyncBadge from "../components/SyncBadge";
import type { MobileRoute } from "../router";
import { getResultPresentation } from "../services/result-state";
import type { VerificationResult } from "../types";

interface ResultPageProps {
  currentRoute: MobileRoute;
  result: VerificationResult | null;
  onNavigatePath: (path: string) => void;
  onNavigate: (route: MobileRoute) => void;
}

const toneClassName = {
  success: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700",
} as const;

export default function ResultPage({
  currentRoute,
  result,
  onNavigatePath,
  onNavigate,
}: ResultPageProps) {
  const presentation = result ? getResultPresentation(result) : null;

  return (
    <div className="ui-page-mobile">
      <main className="ui-main-mobile">
        <h1 className="ui-title text-xl">Attendance Result</h1>
        <p className="ui-note mt-1">Status code mapped recovery guidance.</p>

        <section className="ui-card mt-4 p-4 md:max-w-2xl">
          {result && presentation ? (
            <>
              <p className={`text-base font-semibold ${toneClassName[presentation.tone]}`}>
                {presentation.title}
              </p>
              <p className="mt-2 text-sm text-slate-700">{result.message}</p>
              <p className="ui-note-xs mt-2">{presentation.guidance}</p>
              <ul className="ui-note-xs mt-3 space-y-1">
                <li>Action: {result.action}</li>
                <li>ClientTs: {new Date(result.clientTs).toLocaleString()}</li>
                <li>Geo: {result.geoStatus}</li>
                <li>Reason: {result.reasonCode}</li>
                <li>
                  Sync: <SyncBadge state={result.syncState} />
                </li>
              </ul>
            </>
          ) : (
            <p className="ui-note">No result yet. Start from Home.</p>
          )}
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3 md:max-w-2xl">
          <button
            type="button"
            onClick={() =>
              onNavigatePath(presentation ? presentation.primaryAction.path : "/m/home")
            }
            className="ui-btn ui-btn-primary"
          >
            {presentation ? presentation.primaryAction.label : "Go Home"}
          </button>
          <button
            type="button"
            onClick={() =>
              onNavigatePath(presentation ? presentation.secondaryAction.path : "/m/history")
            }
            className="ui-btn ui-btn-ghost"
          >
            {presentation ? presentation.secondaryAction.label : "View History"}
          </button>
        </div>
      </main>

      <MobileTabBar currentRoute={currentRoute} onNavigate={onNavigate} />
    </div>
  );
}
