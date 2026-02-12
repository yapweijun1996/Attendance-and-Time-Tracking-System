import type { ReactNode } from "react";
import type { MobileRoute } from "../router";

interface DesktopSidebarProps {
    currentRoute: MobileRoute;
    staffName: string | null;
    onNavigate: (route: MobileRoute) => void;
}

const navItems: Array<{ route: MobileRoute; label: string; icon: (active: boolean) => ReactNode }> = [
    {
        route: "/m/home",
        label: "Dashboard",
        icon: (active) => (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )
    },
    {
        route: "/m/history",
        label: "Attendance History",
        icon: (active) => (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    {
        route: "/m/profile",
        label: "My Profile",
        icon: (active) => (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        )
    },
];

export default function DesktopSidebar({ currentRoute, staffName, onNavigate }: DesktopSidebarProps) {
    return (
        <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white lg:flex">
            {/* Brand Header */}
            <div className="flex h-20 items-center gap-3 px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200/50">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Attendance</h2>
                    <p className="text-[10px] font-bold text-slate-400">Staff Workspace</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-4 py-6">
                {navItems.map((item) => {
                    const active = item.route === currentRoute;
                    return (
                        <button
                            key={item.route}
                            onClick={() => onNavigate(item.route)}
                            className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${active
                                ? "bg-slate-50 text-emerald-600"
                                : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-700"
                                }`}
                        >
                            {active && (
                                <div className="absolute left-0 h-5 w-1 rounded-r-full bg-emerald-600" />
                            )}
                            <div className={`${active ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-500"}`}>
                                {item.icon(active)}
                            </div>
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* User Footer */}
            <div className="border-t border-slate-100 p-6">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-black">
                        {staffName?.substring(0, 2).toUpperCase() || "ST"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-900">{staffName || "Staff User"}</p>
                        <p className="truncate text-[10px] font-bold text-slate-400">Authenticated Member</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
