import { useCallback, useState } from "react";

import { createAdminSession, type AdminSession } from "../../services/admin-auth";
import { registerSystemAdmin } from "../../services/system-admin";
import { navigateTo } from "../../shared/navigation";

interface SetupAdminPageProps {
  onSetupCompleted: (session: AdminSession) => void;
}
const CREATE_ADMIN_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Create admin request timed out. Please retry."));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export default function SetupAdminPage({ onSetupCompleted }: SetupAdminPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreateAdmin = useCallback(async () => {
    const trimmedPin = pin.trim();
    const trimmedConfirmPin = confirmPin.trim();

    if (trimmedPin !== trimmedConfirmPin) {
      setErrorMessage("PIN confirmation does not match.");
      setSuccessMessage(null);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const admin = await withTimeout(
        registerSystemAdmin({ name, email, pin: trimmedPin }),
        CREATE_ADMIN_TIMEOUT_MS
      );
      const session = createAdminSession({
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      });
      setSuccessMessage("Super Admin account created. Redirecting to admin console...");
      onSetupCompleted(session);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create system admin.");
      setSuccessMessage(null);
    } finally {
      setSaving(false);
    }
  }, [confirmPin, email, name, onSetupCompleted, pin]);

  return (
    <div className="ui-shell">
      <main className="ui-container max-w-3xl">
        <section className="ui-card p-6 sm:p-8">
          <p className="ui-kicker">System Setup</p>
          <h1 className="ui-title mt-2 text-2xl sm:text-3xl">Create Super Admin</h1>
          <p className="ui-text mt-2 text-sm">
            First-time initialization. This step is required before staff enrollment and attendance workflow.
          </p>

          {errorMessage ? <p className="ui-note-error mt-4">{errorMessage}</p> : null}
          {successMessage ? <p className="ui-note mt-4 text-emerald-700">{successMessage}</p> : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-700 sm:col-span-2">
              Admin Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="ui-input"
                placeholder="e.g. System Owner"
                autoComplete="name"
              />
            </label>

            <label className="text-sm text-slate-700 sm:col-span-2">
              Admin Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="ui-input"
                placeholder="admin@company.com"
                autoComplete="email"
              />
            </label>

            <label className="text-sm text-slate-700">
              6-digit PIN
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="ui-input"
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                autoComplete="new-password"
              />
            </label>

            <label className="text-sm text-slate-700">
              Confirm PIN
              <input
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value)}
                className="ui-input"
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void handleCreateAdmin();
              }}
              disabled={saving}
              className="ui-btn ui-btn-primary min-w-[12rem] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create Super Admin"}
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/debug/health")}
              className="ui-btn ui-btn-ghost"
            >
              Open Debug Health
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
