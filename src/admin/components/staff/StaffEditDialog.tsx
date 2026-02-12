import { useState } from "react";

import type { StaffProfile } from "../../../types/domain";

interface StaffEditDialogProps {
  staff: StaffProfile | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { staffId: string; name: string; dept: string }) => Promise<void>;
}

export default function StaffEditDialog({
  staff,
  saving,
  onClose,
  onSubmit,
}: StaffEditDialogProps) {
  const [name, setName] = useState(staff?.name ?? "");
  const [dept, setDept] = useState(staff?.dept ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!staff) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <section className="ui-card w-full max-w-lg p-5">
        <p className="ui-kicker">Edit Staff</p>
        <h3 className="ui-title text-lg">{staff.staffId}</h3>
        <p className="ui-note mt-1">Update staff basic profile fields.</p>

        <div className="mt-4 space-y-3">
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
            Department (optional)
            <input
              value={dept}
              onChange={(event) => setDept(event.target.value)}
              className="ui-input"
              placeholder="Operations"
            />
          </label>
        </div>

        {errorMessage ? <p className="ui-note-error mt-3">{errorMessage}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-ghost"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            disabled={saving}
            onClick={() => {
              const trimmedName = name.trim();
              if (trimmedName.length < 2) {
                setErrorMessage("Staff name must be at least 2 characters.");
                return;
              }
              void onSubmit({
                staffId: staff.staffId,
                name: trimmedName,
                dept: dept.trim(),
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to update staff profile.");
              });
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>
    </div>
  );
}
