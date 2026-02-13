const auditRows = [
  {
    id: "aud_001",
    actor: "hr_admin",
    action: "EXPORT_CSV",
    target: "payroll_feb",
    at: "2026-02-12 09:12",
  },
  {
    id: "aud_002",
    actor: "hr_admin",
    action: "RESET_FACE",
    target: "staff_003",
    at: "2026-02-12 08:48",
  },
  {
    id: "aud_003",
    actor: "hr_admin",
    action: "UPDATE_POLICY",
    target: "cooldownSec",
    at: "2026-02-11 17:20",
  },
];

export default function AuditPage() {
  return (
    <div className="space-y-4">
      <section className="ui-card p-4">
        <h2 className="ui-title text-sm">Audit Trail</h2>
        <p className="ui-note mt-1">
          Every admin-sensitive action is recorded for traceability.
        </p>
      </section>

      <section className="ui-card p-4">
        <ul className="space-y-2">
          {auditRows.map((row) => (
            <li key={row.id} className="ui-card-soft p-3">
              <p className="text-xs font-mono text-slate-500">{row.id}</p>
              <p className="ui-title mt-1 text-sm">
                {row.action} · {row.target}
              </p>
              <p className="ui-note-xs">
                Actor: {row.actor} · {row.at}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
