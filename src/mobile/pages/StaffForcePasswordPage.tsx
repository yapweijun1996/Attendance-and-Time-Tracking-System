import { useCallback, useState } from "react";

interface StaffForcePasswordPageProps {
  staffId: string;
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  onLogout: () => void;
}

export default function StaffForcePasswordPage({
  staffId,
  onSubmit,
  onLogout,
}: StaffForcePasswordPageProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({
        currentPassword,
        newPassword,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  }, [confirmPassword, currentPassword, newPassword, onSubmit]);

  return (
    <div className="ui-shell">
      <main className="ui-container max-w-md space-y-4 py-6">
        <section className="ui-card p-5">
          <p className="ui-kicker">Security Check</p>
          <h1 className="ui-title mt-2 text-2xl">Change Password</h1>
          <p className="ui-note mt-2">
            Account <strong>{staffId}</strong> must change password before using attendance features.
          </p>
          <p className="ui-note mt-1">Password must be 6-64 characters.</p>

          <div className="mt-4 space-y-3">
            <label className="text-sm text-slate-700">
              Current Password
              <input
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                className="ui-input"
                autoComplete="current-password"
                placeholder="Enter current password"
              />
            </label>

            <label className="text-sm text-slate-700">
              New Password
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                className="ui-input"
                autoComplete="new-password"
                placeholder="Enter new password"
              />
            </label>

            <label className="text-sm text-slate-700">
              Confirm New Password
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                className="ui-input"
                autoComplete="new-password"
                placeholder="Confirm new password"
              />
            </label>
          </div>

          {errorMessage ? <p className="ui-note-error mt-3">{errorMessage}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={submitting}
              className="ui-btn ui-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="ui-btn ui-btn-ghost"
            >
              Logout
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
