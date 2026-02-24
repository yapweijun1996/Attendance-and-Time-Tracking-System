import { useCallback, useEffect, useMemo, useState } from "react";

import { loadRecentEvents } from "../mobile/services/attendance-log";
import type { RecentEvent } from "../mobile/types";
import { readLocationState } from "../shared/navigation";
import AdminSidebar from "./components/AdminSidebar";
import AdminTopNav from "./components/AdminTopNav";
import DashboardPage from "./pages/DashboardPage";
import LogsPage from "./pages/LogsPage";
import StaffPage from "./pages/StaffPage";
import SettingsPage from "./pages/SettingsPage";
import ExportsPage from "./pages/ExportsPage";
import AuditPage from "./pages/AuditPage";
import {
  DEFAULT_ADMIN_ROUTE,
  navigateTo,
  readAdminRoute,
  type AdminRoute,
  type AdminRouteState,
} from "./router";

const pageTitle: Record<AdminRoute, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/logs": "Attendance Logs",
  "/admin/staff": "Staff",
  "/admin/settings": "Settings",
  "/admin/exports": "Exports",
  "/admin/audit": "Audit Trail",
};

const SIDEBAR_COLLAPSE_STORAGE_KEY = "satts.admin.sidebar.collapsed";

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "1";
}

interface AdminAppProps {
  onLogout: () => void;
}

export default function AdminApp({ onLogout }: AdminAppProps) {
  const [routeState, setRouteState] = useState<AdminRouteState>(() => readAdminRoute());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => readSidebarCollapsed());
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => setRouteState(readAdminRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (readLocationState().pathname !== routeState.route) {
      navigateTo(routeState.route, true);
    }
  }, [routeState.route]);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_STORAGE_KEY,
      sidebarCollapsed ? "1" : "0"
    );
  }, [sidebarCollapsed]);

  const refreshLogs = useCallback(async () => {
    setLoading(true);
    try {
      const events = await loadRecentEvents(120);
      setRecentEvents(events);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshLogs();
  }, [refreshLogs]);

  const currentRoute = routeState.route ?? DEFAULT_ADMIN_ROUTE;
  const currentTitle = useMemo(() => pageTitle[currentRoute], [currentRoute]);

  const renderPage = () => {
    if (loading && currentRoute !== "/admin/settings") {
      return (
        <section className="ui-card p-4">
          <p className="ui-note">Loading data...</p>
        </section>
      );
    }
    if (error) {
      return (
        <section className="ui-card p-4">
          <p className="ui-note-error">{error}</p>
        </section>
      );
    }

    switch (currentRoute) {
      case "/admin/dashboard":
        return <DashboardPage recentEvents={recentEvents} />;
      case "/admin/logs":
        return <LogsPage recentEvents={recentEvents} />;
      case "/admin/staff":
        return <StaffPage />;
      case "/admin/settings":
        return <SettingsPage />;
      case "/admin/exports":
        return <ExportsPage />;
      case "/admin/audit":
        return <AuditPage />;
      default:
        return <LogsPage recentEvents={recentEvents} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-slate-900 transition-colors duration-300">
      <AdminSidebar
        currentRoute={currentRoute}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        onNavigate={(route) => navigateTo(route)}
        onSwitchToStaff={() => navigateTo("/m/home")}
      />

      <div className={`flex flex-1 flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? "md:pl-[80px]" : "md:pl-64"}`}>
        <AdminTopNav
          currentRoute={currentRoute}
          onNavigate={(route) => navigateTo(route)}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-y-auto px-4 py-10 sm:px-8 md:px-12">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-500">
            <header className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <span>Satts Central</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-sky-600">Console</span>
                </nav>
                <h1 className="ui-title text-4xl tracking-tight text-slate-900">{currentTitle}</h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Live System</span>
              </div>
            </header>

            <div className="relative">
              {renderPage()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
