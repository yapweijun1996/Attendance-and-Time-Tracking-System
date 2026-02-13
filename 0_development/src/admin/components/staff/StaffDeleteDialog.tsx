import { useState } from "react";

import type { StaffProfile } from "../../../types/domain";
import type { StaffDeleteExportBundle, StaffDeleteImpact } from "../../../services/staff-admin";

interface StaffDeleteDialogProps {
  staff: StaffProfile | null;
  deleting: boolean;
  impact: StaffDeleteImpact | null;
  impactLoading: boolean;
  impactError: string | null;
  onClose: () => void;
  onExport: (staffId: string) => Promise<StaffDeleteExportBundle>;
  onConfirm: (staffId: string) => Promise<void>;
}

function createExportFileName(staffId: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `staff-delete-backup-${staffId}-${stamp}.json`;
}

function downloadJsonFile(fileName: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

export default function StaffDeleteDialog({
  staff,
  deleting,
  impact,
  impactLoading,
  impactError,
  onClose,
  onExport,
  onConfirm,
}: StaffDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  if (!staff) {
    return null;
  }

  const expected = staff.staffId;
  const impactReady = !impactLoading && !impactError && impact !== null;
  const hasLinkedData = Boolean(impact && (impact.hasUserProfile || impact.attendanceCount > 0));
  const requireExportBeforeDelete = impactReady && hasLinkedData;
  const hasExportedForDelete = exportMessage !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <section className="ui-card w-full max-w-lg p-5">
        <p className="ui-kicker">Delete Staff</p>
        <h3 className="ui-title text-lg text-rose-700">{expected}</h3>
        <p className="ui-note mt-1">
          This action deletes the staff record from local database.
        </p>
        <p className="ui-note mt-1">
          Type <strong>{expected}</strong> to confirm.
        </p>

        <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Impact Check</p>
          {impactLoading ? (
            <p className="mt-2 text-xs text-slate-600">Checking related records...</p>
          ) : impactError ? (
            <p className="mt-2 text-xs text-rose-700">{impactError}</p>
          ) : impact ? (
            <>
              <p className="mt-2 text-xs text-slate-700">
                Linked USER_PROFILE: <strong>{impact.hasUserProfile ? "YES" : "NO"}</strong>
              </p>
              <p className="mt-1 text-xs text-slate-700">
                ATTENDANCE_LOG count: <strong>{impact.attendanceCount}</strong>
              </p>
              {impact.hasUserProfile || impact.attendanceCount > 0 ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Warning: deleting staff will not remove linked profile/log records.
                </p>
              ) : (
                <p className="mt-2 text-xs text-emerald-700">No linked profile or attendance logs found.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-600">No impact data.</p>
          )}
        </section>

        {requireExportBeforeDelete ? (
          <section className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">
              Export linked data before delete is required.
            </p>
            <button
              type="button"
              disabled={exporting || deleting}
              className="ui-btn ui-btn-ghost mt-2 min-h-0 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                setErrorMessage(null);
                setExportMessage(null);
                setExporting(true);
                void onExport(expected)
                  .then((bundle) => {
                    downloadJsonFile(createExportFileName(expected), bundle);
                    setExportMessage("Linked data exported successfully.");
                  })
                  .catch((error: unknown) => {
                    setErrorMessage(error instanceof Error ? error.message : "Failed to export linked data.");
                  })
                  .finally(() => {
                    setExporting(false);
                  });
              }}
            >
              {exporting ? "Exporting..." : "Export Linked Data (JSON)"}
            </button>
            {exportMessage ? <p className="mt-2 text-xs text-emerald-700">{exportMessage}</p> : null}
          </section>
        ) : null}

        <label className="mt-4 block text-sm text-slate-700">
          Confirmation
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value.toUpperCase())}
            className="ui-input"
            placeholder={`Type ${expected}`}
          />
        </label>

        {errorMessage ? <p className="ui-note-error mt-3">{errorMessage}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-ghost"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-danger"
            disabled={deleting}
            onClick={() => {
              if (impactLoading) {
                setErrorMessage("Impact check is still running. Please wait.");
                return;
              }
              if (!impactReady) {
                setErrorMessage("Impact check is unavailable. Reopen the dialog and retry.");
                return;
              }
              if (confirmText.trim().toUpperCase() !== expected) {
                setErrorMessage("Delete confirmation does not match Staff ID.");
                return;
              }
              if (requireExportBeforeDelete && !hasExportedForDelete) {
                setErrorMessage("Please export linked data before deleting this staff.");
                return;
              }
              setErrorMessage(null);
              void onConfirm(expected).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete staff.");
              });
            }}
          >
            {deleting ? "Deleting..." : "Delete Staff"}
          </button>
        </div>
      </section>
    </div>
  );
}
