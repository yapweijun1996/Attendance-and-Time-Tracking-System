const exportHistory = [
  { id: "exp_001", at: "2026-02-12 09:10", status: "READY", rows: 284 },
  { id: "exp_002", at: "2026-02-11 18:02", status: "READY", rows: 279 },
];

export default function ExportsPage() {
  return (
    <div className="space-y-4">
      <section className="ui-card p-4">
        <h2 className="ui-title text-sm">Payroll CSV Export</h2>
        <p className="ui-note mt-1">
          Export includes action, timestamps, geo status, and evidence reference.
        </p>
        <button
          type="button"
          className="ui-btn ui-btn-success mt-4"
        >
          Generate New Export
        </button>
      </section>

      <section className="ui-card p-4">
        <h3 className="ui-title text-sm">Recent Exports</h3>
        <ul className="mt-3 space-y-2">
          {exportHistory.map((item) => (
            <li key={item.id} className="ui-card-soft p-3">
              <p className="text-xs font-mono text-slate-500">{item.id}</p>
              <p className="ui-note mt-1">
                {item.at} · {item.rows} rows · {item.status}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
