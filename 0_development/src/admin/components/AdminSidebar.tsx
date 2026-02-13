import type { AdminRoute } from "../router";

interface AdminSidebarProps {
  currentRoute: AdminRoute;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (route: AdminRoute) => void;
  onSwitchToStaff: () => void;
}

type SidebarIconName = "dashboard" | "logs" | "staff" | "settings" | "exports" | "audit";

interface NavItem {
  route: AdminRoute;
  label: string;
  hint: string;
  icon: SidebarIconName;
}

const navItems: NavItem[] = [
  { route: "/admin/dashboard", label: "Dashboard", hint: "Overview", icon: "dashboard" },
  { route: "/admin/logs", label: "Logs", hint: "Attendance Feed", icon: "logs" },
  { route: "/admin/staff", label: "Staff", hint: "People & Roles", icon: "staff" },
  { route: "/admin/settings", label: "Settings", hint: "Policy Controls", icon: "settings" },
  { route: "/admin/exports", label: "Exports", hint: "Payroll CSV", icon: "exports" },
  { route: "/admin/audit", label: "Audit", hint: "Action History", icon: "audit" },
];

function SidebarIcon({ name, active }: { name: SidebarIconName; active: boolean }) {
  const stroke = active ? "currentColor" : "#335170";

  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM13 10h7v10h-7V10ZM4 13h7v7H4v-7Z" stroke={stroke} strokeWidth="1.7" />
        </svg>
      );
    case "logs":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M6 4h12a2 2 0 0 1 2 2v12H4V6a2 2 0 0 1 2-2Zm2 5h8M8 13h8M8 17h5" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "staff":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19a5 5 0 0 1 10 0M11 19a5 5 0 0 1 10 0" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M10.9 4h2.2l.6 2.1a6.7 6.7 0 0 1 1.8.8l2-1 1.6 1.6-1 2c.3.6.6 1.2.8 1.8l2.1.6v2.2l-2.1.6a6.8 6.8 0 0 1-.8 1.8l1 2-1.6 1.6-2-1a6.8 6.8 0 0 1-1.8.8l-.6 2.1h-2.2l-.6-2.1a6.7 6.7 0 0 1-1.8-.8l-2 1-1.6-1.6 1-2a6.8 6.8 0 0 1-.8-1.8L3 13.1v-2.2l2.1-.6a6.7 6.7 0 0 1 .8-1.8l-1-2L6.5 4.9l2 1c.6-.3 1.2-.6 1.8-.8L10.9 4Zm1.1 5.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "exports":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M12 6v6l4 2m5-2a9 9 0 1 1-3.2-6.9" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function AdminSidebar({
  currentRoute,
  collapsed,
  onToggleCollapse,
  onNavigate,
  onSwitchToStaff,
}: AdminSidebarProps) {
  return (
    <aside
      className={`hidden h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-300 py-8 md:flex transition-all duration-300 fixed left-0 top-0 z-30 ${collapsed ? "w-[80px]" : "w-64"
        }`}
    >
      {/* Sidebar Header / Logo area */}
      <div className={`mb-10 flex items-center px-4 ${collapsed ? "flex-col gap-4" : "justify-between"}`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          {!collapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h2 className="text-sm font-black tracking-tight text-white uppercase italic">SATTS Central</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">ERP Core v1.0</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
            aria-label="Collapse sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {!collapsed ? (
        <p className="mb-4 px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Navigator</p>
      ) : (
        <div className="mx-auto mb-6 flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-800 cursor-pointer text-slate-500 hover:text-white transition-all" onClick={onToggleCollapse}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = item.route === currentRoute;
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => onNavigate(item.route)}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={`group relative flex w-full items-center rounded-xl transition-all duration-200 ${collapsed ? "justify-center py-3" : "gap-3 px-3 py-2.5 text-left"
                } ${active
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${active ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                  }`}
              >
                <SidebarIcon name={item.icon} active={active} />
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="text-sm font-bold tracking-tight">{item.label}</p>
                </div>
              ) : null}
              {active && (
                <div className="absolute left-0 h-5 w-1 rounded-r-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className={`mt-auto p-4 border-t border-slate-900 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          type="button"
          onClick={onSwitchToStaff}
          className={`flex items-center gap-3 rounded-xl transition-all duration-200 ${collapsed
            ? "h-11 w-11 justify-center bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-white"
            : "w-full bg-slate-900 px-4 py-3 text-left text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          title="Switch to Staff Interface"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-xs font-bold tracking-tight">Staff Workspace</span>
          )}
        </button>
      </div>
    </aside>
  );
}
