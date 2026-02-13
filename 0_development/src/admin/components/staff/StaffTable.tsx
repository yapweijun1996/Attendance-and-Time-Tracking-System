import type { StaffProfile, StaffStatus } from "../../../types/domain";

interface StaffTableProps {
  rows: StaffProfile[];
  loading: boolean;
  onEdit: (row: StaffProfile) => void;
  onToggleLock: (row: StaffProfile) => void;
  onDelete: (row: StaffProfile) => void;
}

function statusTone(status: StaffStatus): string {
  if (status === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "LOCKED") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function authTone(row: StaffProfile): string {
  if (!row.credentials) {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  if (row.credentials.mustChangePassword) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function authLabel(row: StaffProfile): string {
  if (!row.credentials) {
    return "NO_PASSWORD";
  }
  if (row.credentials.mustChangePassword) {
    return "FORCE_CHANGE";
  }
  return "READY";
}

export default function StaffTable({
  rows,
  loading,
  onEdit,
  onToggleLock,
  onDelete,
}: StaffTableProps) {
  return (
    <section className="ui-table-shell">
      <table className="ui-table">
        <thead className="ui-thead">
          <tr>
            <th scope="col" className="ui-th">Staff ID</th>
            <th scope="col" className="ui-th">Name</th>
            <th scope="col" className="ui-th">Dept</th>
            <th scope="col" className="ui-th">Status</th>
            <th scope="col" className="ui-th">Auth</th>
            <th scope="col" className="ui-th">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr className="ui-row">
              <td className="ui-td text-slate-500" colSpan={6}>
                Loading staff...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr className="ui-row">
              <td className="ui-td text-slate-500" colSpan={6}>
                No staff records yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row._id} className="ui-row">
                <td className="ui-td font-mono text-xs font-semibold tracking-wide text-slate-700">{row.staffId}</td>
                <td className="ui-td font-semibold text-slate-900">{row.name}</td>
                <td className="ui-td text-slate-700">{row.dept ?? "-"}</td>
                <td className="ui-td">
                  <span className={`ui-pill text-[11px] ring-1 ${statusTone(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="ui-td">
                  <span className={`ui-pill text-[11px] ring-1 ${authTone(row)}`}>
                    {authLabel(row)}
                  </span>
                </td>
                <td className="ui-td">
                  <div className="ui-table-actions">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="ui-btn ui-btn-ghost min-h-0 px-3 py-1.5 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLock(row)}
                      className="ui-btn ui-btn-ghost min-h-0 px-3 py-1.5 text-xs"
                    >
                      {row.status === "LOCKED" ? "Unlock" : "Lock"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className="ui-btn ui-btn-danger min-h-0 px-3 py-1.5 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
