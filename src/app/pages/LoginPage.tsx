import { useCallback, useEffect, useState } from "react";

import { bindStaffId } from "../../mobile/services/staff-binding";
import { createStaffSession } from "../../mobile/services/staff-session";
import { createAdminSession, type AdminSession } from "../../services/admin-auth";
import { authenticateStaff } from "../../services/staff-master";
import { authenticateSystemAdmin } from "../../services/system-admin";
import { navigateTo } from "../../shared/navigation";

type LoginRole = "staff" | "admin";

interface LoginPageProps {
  preferredRole: LoginRole;
  adminNextPath: string | null;
  onAdminLoginSuccess: (session: AdminSession, targetPath: string) => void;
}

const DEFAULT_ADMIN_HOME_PATH = "/admin/logs";

function resolveAdminTargetPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return DEFAULT_ADMIN_HOME_PATH;
  }
  return nextPath;
}

function mapStaffLoginError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Failed to sign in.";
  }
  if (error.message.includes("has no password")) {
    return `${error.message} Ask admin to use Staff Management > Reset Password.`;
  }
  return error.message;
}

export default function LoginPage({ preferredRole, adminNextPath, onAdminLoginSuccess }: LoginPageProps) {
  const [role, setRole] = useState<LoginRole>(preferredRole);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [staffId, setStaffId] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPin, setAdminPin] = useState("");

  useEffect(() => {
    setRole(preferredRole);
    setErrorMessage(null);
  }, [preferredRole]);

  const handleStaffLogin = useCallback(async () => {
    if (!staffId.trim() || !staffPassword.trim()) {
      setErrorMessage("Staff ID and password are required.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const staff = await authenticateStaff({
        staffId,
        password: staffPassword,
      });
      const mustChangePassword = staff.credentials?.mustChangePassword ?? true;
      createStaffSession({ staffId: staff.staffId, name: staff.name }, mustChangePassword);
      bindStaffId(staff.staffId);
      navigateTo(mustChangePassword ? "/m/change-password" : "/m/home", true);
    } catch (error) {
      setErrorMessage(mapStaffLoginError(error));
    } finally {
      setLoading(false);
    }
  }, [staffId, staffPassword]);

  const handleAdminLogin = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const admin = await authenticateSystemAdmin({
        email: adminEmail,
        pin: adminPin,
      });
      const session = createAdminSession({
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      });
      onAdminLoginSuccess(session, resolveAdminTargetPath(adminNextPath));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }, [adminEmail, adminNextPath, adminPin, onAdminLoginSuccess]);

  return (
    <div className="ui-shell">
      <main className="ui-container max-w-2xl">
        <section className="ui-card p-6 sm:p-8">
          <p className="ui-kicker">Unified Access</p>
          <h1 className="ui-title mt-2 text-2xl sm:text-3xl">Sign In</h1>
          <p className="ui-text mt-2 text-sm">
            Staff and Admin now share one login page.
          </p>

          <div className="mt-5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setRole("staff")}
              className={`ui-btn min-h-0 px-3 py-1.5 text-xs ${
                role === "staff" ? "ui-btn-primary" : "ui-btn-ghost"
              }`}
            >
              Staff Login
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`ui-btn min-h-0 px-3 py-1.5 text-xs ${
                role === "admin" ? "ui-btn-primary" : "ui-btn-ghost"
              }`}
            >
              Admin Login
            </button>
          </div>

          {errorMessage ? <p className="ui-note-error mt-4">{errorMessage}</p> : null}

          {role === "staff" ? (
            <div className="mt-6 grid gap-4">
              <p className="ui-note text-amber-700">First login requires password change.</p>
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
                Password
                <input
                  value={staffPassword}
                  onChange={(event) => setStaffPassword(event.target.value)}
                  type="password"
                  className="ui-input"
                  autoComplete="current-password"
                  placeholder="Enter password"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  void handleStaffLogin();
                }}
                disabled={loading}
                className="ui-btn ui-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing In..." : "Sign In as Staff"}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              <label className="text-sm text-slate-700">
                Admin Email
                <input
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  className="ui-input"
                  placeholder="admin@company.com"
                  autoComplete="email"
                />
              </label>
              <label className="text-sm text-slate-700">
                6-digit PIN
                <input
                  value={adminPin}
                  onChange={(event) => setAdminPin(event.target.value)}
                  className="ui-input"
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  void handleAdminLogin();
                }}
                disabled={loading}
                className="ui-btn ui-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing In..." : "Sign In as Admin"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
