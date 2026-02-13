interface StaffCreateFormProps {
  staffId: string;
  name: string;
  dept: string;
  initialPassword: string;
  saving: boolean;
  onStaffIdChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onDeptChange: (value: string) => void;
  onInitialPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export default function StaffCreateForm({
  staffId,
  name,
  dept,
  initialPassword,
  saving,
  onStaffIdChange,
  onNameChange,
  onDeptChange,
  onInitialPasswordChange,
  onSubmit,
}: StaffCreateFormProps) {
  return (
    <section className="ui-card p-4">
      <h3 className="ui-title text-sm">Create Staff</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <label className="text-sm text-slate-700">
          Staff ID
          <input
            value={staffId}
            onChange={(event) => onStaffIdChange(event.target.value.toUpperCase())}
            className="ui-input"
            placeholder="STAFF_001"
          />
        </label>
        <label className="text-sm text-slate-700">
          Name
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="ui-input"
            placeholder="Jane Tan"
          />
        </label>
        <label className="text-sm text-slate-700">
          Department
          <input
            value={dept}
            onChange={(event) => onDeptChange(event.target.value)}
            className="ui-input"
            placeholder="Operations"
          />
        </label>
        <label className="text-sm text-slate-700">
          Temporary Password
          <input
            value={initialPassword}
            onChange={(event) => onInitialPasswordChange(event.target.value)}
            className="ui-input"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 chars"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={saving}
        className="ui-btn ui-btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Create Staff"}
      </button>
    </section>
  );
}
