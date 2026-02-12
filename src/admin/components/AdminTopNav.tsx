import type { AdminRoute } from "../router";

interface AdminTopNavProps {
  currentRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onLogout: () => void;
}

const navItems: Array<{ route: AdminRoute; shortLabel: string }> = [
  { route: "/admin/dashboard", shortLabel: "Dash" },
  { route: "/admin/logs", shortLabel: "Logs" },
  { route: "/admin/staff", shortLabel: "Staff" },
  { route: "/admin/settings", shortLabel: "Settings" },
  { route: "/admin/exports", shortLabel: "Exports" },
  { route: "/admin/audit", shortLabel: "Audit" },
];

export default function AdminTopNav({
  currentRoute,
  onNavigate,
  onLogout,
}: AdminTopNavProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="md:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-bold tracking-tight text-slate-900">SATTS Admin</p>
          </div>
        </div>

        <div className="hidden md:block text-xs font-medium text-slate-400">
          Last active: Just now
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="ui-btn ui-btn-ghost min-h-0 px-3 py-1.5 text-xs"
          >
            Logout
          </button>
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
            AD
          </div>
        </div>
      </div>

      {/* Mobile Tab Nav */}
      <nav className="mx-auto flex w-full max-w-7xl gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6 md:hidden no-scrollbar">
        {navItems.map((item) => {
          const active = item.route === currentRoute;
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => onNavigate(item.route)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${active
                ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
            >
              {item.shortLabel}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
