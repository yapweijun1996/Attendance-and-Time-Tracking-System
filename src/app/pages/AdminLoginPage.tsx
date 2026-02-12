import { useCallback, useState } from "react";

import { createAdminSession, type AdminSession } from "../../services/admin-auth";
import { authenticateSystemAdmin } from "../../services/system-admin";
import { navigateTo } from "../../shared/navigation";

interface AdminLoginPageProps {
  onLoginSuccess: (session: AdminSession) => void;
}

export default function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const admin = await authenticateSystemAdmin({ email, pin });
      const session = createAdminSession({
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      });
      onLoginSuccess(session);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to login.");
    } finally {
      setLoading(false);
    }
  }, [email, onLoginSuccess, pin]);

  return (
    <div className="ui-shell">
      <main className="ui-container max-w-2xl">
        <section className="ui-card p-6 sm:p-8">
          <p className="ui-kicker">Admin Access</p>
          <h1 className="ui-title mt-2 text-2xl sm:text-3xl">Sign In</h1>
          <p className="ui-text mt-2 text-sm">
            Enter Super Admin credentials to access management console.
          </p>

          {errorMessage ? <p className="ui-note-error mt-4">{errorMessage}</p> : null}

          <div className="mt-6 grid gap-4">
            <label className="text-sm text-slate-700">
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
                maxLength={6}
                inputMode="numeric"
                autoComplete="current-password"
              />
            </label>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                void handleLogin();
              }}
              disabled={loading}
              className="ui-btn ui-btn-primary min-w-[12rem] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/debug/health")}
              className="ui-btn ui-btn-ghost ml-3"
            >
              Open Debug Health
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
