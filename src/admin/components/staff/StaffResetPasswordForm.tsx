interface StaffResetPasswordFormProps {
  staffId: string;
  resetPassword: string;
  saving: boolean;
  onStaffIdChange: (value: string) => void;
  onResetPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export default function StaffResetPasswordForm({
  staffId,
  resetPassword,
  saving,
  onStaffIdChange,
  onResetPasswordChange,
  onSubmit,
}: StaffResetPasswordFormProps) {
  return (
    <section className="ui-card p-4">
      <h3 className="ui-title text-sm">Reset Staff Password</h3>
      <p className="ui-note mt-1">Reset will force password change at next login.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          New Temporary Password
          <input
            value={resetPassword}
            onChange={(event) => onResetPasswordChange(event.target.value)}
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
        className="ui-btn ui-btn-ghost mt-4 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Processing..." : "Reset Password"}
      </button>
    </section>
  );
}
