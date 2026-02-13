import { useCallback, useMemo, useState } from "react";

import { runDebugHealthChecks, type DebugCheckResult, type DebugHealthReport } from "../../services/debug-health";
import { navigateTo } from "../../shared/navigation";

function statusClass(status: DebugCheckResult["status"]): string {
  switch (status) {
    case "PASS":
      return "text-emerald-700";
    case "WARN":
      return "text-amber-700";
    default:
      return "text-rose-700";
  }
}

export default function DebugHealthPage() {
  const [report, setReport] = useState<DebugHealthReport | null>(null);
  const [running, setRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reportJson = useMemo(() => {
    if (!report) {
      return "";
    }
    return JSON.stringify(report, null, 2);
  }, [report]);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setErrorMessage(null);
    try {
      const nextReport = await runDebugHealthChecks();
      setReport(nextReport);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to run debug checks.");
      setReport(null);
    } finally {
      setRunning(false);
    }
  }, []);

  const copyReport = useCallback(async () => {
    if (!reportJson) {
      return;
    }
    await navigator.clipboard.writeText(reportJson);
  }, [reportJson]);

  return (
    <div className="ui-shell">
      <main className="ui-container max-w-4xl space-y-4">
        <section className="ui-card p-6">
          <p className="ui-kicker">Debug</p>
          <h1 className="ui-title mt-2 text-2xl">System Health</h1>
          <p className="ui-text mt-2 text-sm">
            Run checks for browser storage, PouchDB, admin document, and session state.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void runChecks();
              }}
              disabled={running}
              className="ui-btn ui-btn-primary min-w-[12rem] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? "Running..." : "Run Diagnostics"}
            </button>
            <button
              type="button"
              onClick={copyReport}
              disabled={!reportJson}
              className="ui-btn ui-btn-ghost min-w-[10rem] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copy JSON
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/debug/db")}
              className="ui-btn ui-btn-ghost"
            >
              Open DB Explorer
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/setup/admin")}
              className="ui-btn ui-btn-ghost"
            >
              Back to Setup
            </button>
          </div>

          {errorMessage ? <p className="ui-note-error mt-4">{errorMessage}</p> : null}
        </section>

        {report ? (
          <section className="ui-card p-6">
            <p className="ui-note-xs">Generated At: {report.generatedAt}</p>
            <ul className="mt-4 space-y-3">
              {report.checks.map((check) => (
                <li key={check.id} className="rounded-xl border border-slate-100 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                    <p className={`text-xs font-bold ${statusClass(check.status)}`}>
                      {check.status} · {check.durationMs}ms
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{check.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
