import { useCallback, useEffect, useState } from "react";

import AdminApp from "../admin/AdminApp";
import MobileApp from "../mobile/MobileApp";
import { clearAdminSession, readAdminSession, type AdminSession } from "../services/admin-auth";
import { hasSystemAdmin } from "../services/system-admin";
import DebugDatabasePage from "./pages/DebugDatabasePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DebugHealthPage from "./pages/DebugHealthPage";
import LandingPage from "./pages/LandingPage";
import SetupAdminPage from "./pages/SetupAdminPage";
import { navigateTo, readLocationState } from "../shared/navigation";

type SetupStatus = "required" | "ready";
const BOOTSTRAP_CHECK_TIMEOUT_MS = 12000;
const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_HOME_PATH = "/admin/logs";
const DEBUG_HEALTH_PATH = "/debug/health";
const DEBUG_DB_PATH = "/debug/db";
const SESSION_RECHECK_INTERVAL_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Bootstrap check timed out."));
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

export default function AppRouter() {
  const [locationState, setLocationState] = useState(() => readLocationState());
  const [setupStatus, setSetupStatus] = useState<SetupStatus>("required");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => readAdminSession());

  const checkSetupStatus = useCallback(async () => {
    try {
      const ready = await withTimeout(hasSystemAdmin(), BOOTSTRAP_CHECK_TIMEOUT_MS);
      setSetupStatus(ready ? "ready" : "required");
      setSetupError(null);
    } catch (error) {
      setSetupStatus("required");
      if (error instanceof Error && error.message.includes("timed out")) {
        // Slow chunk/runtime init should not block first-run setup.
        setSetupError(null);
        return;
      }
      setSetupError(
        error instanceof Error
          ? `${error.message} Continue setup, and refresh if browser storage is blocked.`
          : "Failed to read setup status."
      );
    }
  }, []);

  const refreshAdminSession = useCallback(() => {
    setAdminSession(readAdminSession());
  }, []);

  useEffect(() => {
    const onPopState = () => setLocationState(readLocationState());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(refreshAdminSession, SESSION_RECHECK_INTERVAL_MS);
    const onStorageChange = () => refreshAdminSession();
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [refreshAdminSession]);

  useEffect(() => {
    let cancelled = false;

    const checkSetup = async () => {
      await checkSetupStatus();
      if (cancelled) {
        return;
      }
    };

    void checkSetup();
    return () => {
      cancelled = true;
    };
  }, [checkSetupStatus]);

  useEffect(() => {
    if (
      setupStatus === "required" &&
      locationState.pathname !== "/setup/admin" &&
      locationState.pathname !== DEBUG_HEALTH_PATH &&
      locationState.pathname !== DEBUG_DB_PATH
    ) {
      navigateTo("/setup/admin", true);
      return;
    }
    if (setupStatus !== "ready") {
      return;
    }

    if (locationState.pathname.startsWith("/setup/admin")) {
      navigateTo(adminSession ? ADMIN_HOME_PATH : ADMIN_LOGIN_PATH, true);
      return;
    }

    if (locationState.pathname === DEBUG_DB_PATH && !adminSession) {
      navigateTo(ADMIN_LOGIN_PATH, true);
      return;
    }

    if (!locationState.pathname.startsWith("/admin")) {
      return;
    }

    if (!adminSession && locationState.pathname !== ADMIN_LOGIN_PATH) {
      navigateTo(ADMIN_LOGIN_PATH, true);
      return;
    }

    if (adminSession && locationState.pathname === ADMIN_LOGIN_PATH) {
      navigateTo(ADMIN_HOME_PATH, true);
    }
  }, [adminSession, locationState.pathname, setupStatus]);

  const handleSetupCompleted = useCallback((session: AdminSession) => {
    setSetupStatus("ready");
    setSetupError(null);
    setAdminSession(session);
    navigateTo(ADMIN_HOME_PATH, true);
  }, []);

  const handleLoginSuccess = useCallback((session: AdminSession) => {
    setAdminSession(session);
    navigateTo(ADMIN_HOME_PATH, true);
  }, []);

  const handleAdminLogout = useCallback(() => {
    clearAdminSession();
    setAdminSession(null);
    navigateTo(ADMIN_LOGIN_PATH, true);
  }, []);

  if (setupStatus === "required") {
    if (locationState.pathname === DEBUG_HEALTH_PATH) {
      return <DebugHealthPage />;
    }
    if (locationState.pathname === DEBUG_DB_PATH) {
      return <DebugDatabasePage adminSession={adminSession} />;
    }
    return (
      <>
        {setupError ? <div className="ui-banner-error">{setupError}</div> : null}
        <SetupAdminPage onSetupCompleted={handleSetupCompleted} />
        <div className="ui-shell pt-0">
          <main className="ui-container max-w-3xl">
            <button
              type="button"
              onClick={() => {
                void checkSetupStatus();
              }}
              className="ui-btn ui-btn-ghost"
            >
              Retry Bootstrap Check
            </button>
          </main>
        </div>
      </>
    );
  }

  if (locationState.pathname === DEBUG_HEALTH_PATH) {
    return <DebugHealthPage />;
  }
  if (locationState.pathname === DEBUG_DB_PATH) {
    if (!adminSession) {
      return <AdminLoginPage onLoginSuccess={handleLoginSuccess} />;
    }
    return <DebugDatabasePage adminSession={adminSession} />;
  }

  if (locationState.pathname.startsWith("/admin")) {
    if (!adminSession || locationState.pathname === ADMIN_LOGIN_PATH) {
      return <AdminLoginPage onLoginSuccess={handleLoginSuccess} />;
    }
    return <AdminApp onLogout={handleAdminLogout} />;
  }
  if (locationState.pathname.startsWith("/m/")) {
    return <MobileApp />;
  }
  return <LandingPage />;
}
