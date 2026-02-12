import { useCallback, useEffect, useState } from "react";

import type { StaffProfile, StaffStatus } from "../../types/domain";
import {
  createStaffProfile,
  listStaffProfiles,
  updateStaffStatus,
} from "../../services/staff-master";

function statusTone(status: StaffStatus): string {
  if (status === "ACTIVE") {
    return "text-emerald-700";
  }
  if (status === "LOCKED") {
    return "text-rose-700";
  }
  return "text-amber-700";
}

export default function StaffPage() {
  const [staffRows, setStaffRows] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshStaff = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listStaffProfiles(200);
      setStaffRows(rows);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStaff();
  }, [refreshStaff]);

  const handleCreateStaff = useCallback(async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await createStaffProfile({
        staffId,
        name,
        dept,
      });
      setStaffId("");
      setName("");
      setDept("");
      setSuccessMessage(`Staff ${created.staffId} created. Ask user to bind this ID on mobile Profile.`);
      await refreshStaff();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create staff.");
    } finally {
      setSaving(false);
    }
  }, [dept, name, refreshStaff, staffId]);

  const handleToggleLock = useCallback(
    async (row: StaffProfile) => {
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const nextStatus: StaffStatus = row.status === "LOCKED" ? "PENDING_ENROLL" : "LOCKED";
        await updateStaffStatus(row.staffId, nextStatus);
        setSuccessMessage(`Staff ${row.staffId} updated to ${nextStatus}.`);
        await refreshStaff();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to update staff.");
      }
    },
    [refreshStaff]
  );

  return (
    <div className="space-y-4">
      <section className="ui-card p-4">
        <h2 className="ui-title text-sm">Staff Master</h2>
        <p className="ui-note mt-1">
          Create staff records here, then bind staff ID on mobile Profile before enrollment.
        </p>
        {errorMessage ? <p className="ui-note-error mt-2">{errorMessage}</p> : null}
        {successMessage ? <p className="ui-note mt-2 text-emerald-700">{successMessage}</p> : null}
      </section>

      <section className="ui-card p-4">
        <h3 className="ui-title text-sm">Create Staff</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-slate-700">
            Staff ID
            <input
              value={staffId}
              onChange={(event) => setStaffId(event.target.value.toUpperCase())}
              className="ui-input"
              placeholder="STAFF_001"
            />
          </label>
          <label className="text-sm text-slate-700">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="ui-input"
              placeholder="Jane Tan"
            />
          </label>
          <label className="text-sm text-slate-700">
            Department
            <input
              value={dept}
              onChange={(event) => setDept(event.target.value)}
              className="ui-input"
              placeholder="Operations"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleCreateStaff();
          }}
          disabled={saving}
          className="ui-btn ui-btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Create Staff"}
        </button>
      </section>

      <section className="ui-table-shell">
        <table className="ui-table">
          <thead className="ui-thead">
            <tr>
              <th className="ui-th">Staff ID</th>
              <th className="ui-th">Name</th>
              <th className="ui-th">Dept</th>
              <th className="ui-th">Status</th>
              <th className="ui-th">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="ui-row">
                <td className="ui-td text-slate-500" colSpan={5}>
                  Loading staff...
                </td>
              </tr>
            ) : staffRows.length === 0 ? (
              <tr className="ui-row">
                <td className="ui-td text-slate-500" colSpan={5}>
                  No staff records yet.
                </td>
              </tr>
            ) : (
              staffRows.map((row) => (
                <tr key={row._id} className="ui-row">
                  <td className="ui-td font-mono text-xs text-slate-600">{row.staffId}</td>
                  <td className="ui-td font-semibold text-slate-900">{row.name}</td>
                  <td className="ui-td text-slate-700">{row.dept ?? "-"}</td>
                  <td className={`ui-td font-semibold ${statusTone(row.status)}`}>{row.status}</td>
                  <td className="ui-td">
                    <button
                      type="button"
                      onClick={() => {
                        void handleToggleLock(row);
                      }}
                      className="ui-btn ui-btn-ghost min-h-0 px-3 py-1.5 text-xs"
                    >
                      {row.status === "LOCKED" ? "Unlock" : "Lock"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
