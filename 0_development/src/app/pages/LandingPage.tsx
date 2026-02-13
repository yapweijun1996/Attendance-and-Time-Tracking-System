import { navigateTo } from "../../shared/navigation";

export default function LandingPage() {
  return (
    <div className="ui-shell">
      <main className="ui-container">
        <header className="ui-card rounded-2xl p-6">
          <p className="ui-kicker">SATTS</p>
          <h1 className="ui-title mt-2 text-2xl sm:text-3xl">Attendance & Time Tracking</h1>
          <p className="ui-text mt-2 text-sm sm:text-base">
            Responsive workspace for staff mobile attendance and HR admin operations.
          </p>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="ui-card p-5">
            <p className="ui-kicker">Mobile</p>
            <h2 className="ui-title mt-2 text-lg">Staff Attendance</h2>
            <p className="ui-text mt-2 text-sm">
              Time In/Out, enrollment, offline sync state, and evidence capture flow.
            </p>
            <button
              type="button"
              onClick={() => navigateTo("/m/home")}
              className="ui-btn ui-btn-primary mt-4 w-full"
            >
              Open Staff App
            </button>
          </article>

          <article className="ui-card p-5">
            <p className="ui-kicker">PC</p>
            <h2 className="ui-title mt-2 text-lg">Admin Console</h2>
            <p className="ui-text mt-2 text-sm">
              Logs, staff reset, settings, exports, and audit in a multi-panel desktop layout.
            </p>
            <button
              type="button"
              onClick={() => navigateTo("/admin/logs")}
              className="ui-btn ui-btn-success mt-4 w-full"
            >
              Open Admin Console
            </button>
          </article>

          <article className="ui-card p-5 md:col-span-2 xl:col-span-1">
            <p className="ui-kicker">Tablet</p>
            <h2 className="ui-title mt-2 text-lg">Hybrid Layout</h2>
            <p className="ui-text mt-2 text-sm">
              Staff pages auto-expand to tablet spacing with persistent navigation for touch ergonomics.
            </p>
            <button
              type="button"
              onClick={() => navigateTo("/m/history")}
              className="ui-btn ui-btn-info mt-4 w-full"
            >
              Preview Tablet Staff
            </button>
          </article>
        </section>
      </main>
    </div>
  );
}
