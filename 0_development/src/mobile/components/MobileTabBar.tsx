import type { MobileRoute } from "../router";

interface MobileTabBarProps {
  currentRoute: MobileRoute;
  onNavigate: (route: MobileRoute) => void;
}

type TabIconName = "home" | "history" | "profile";

const tabs: Array<{ route: MobileRoute; label: string; iconName: TabIconName }> = [
  { route: "/m/home", label: "Home", iconName: "home" },
  { route: "/m/history", label: "History", iconName: "history" },
  { route: "/m/profile", label: "Profile", iconName: "profile" },
];

export default function MobileTabBar({ currentRoute, onNavigate }: MobileTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-20 items-center justify-around border-t border-slate-100 bg-white/80 px-4 pb-safe backdrop-blur-xl lg:hidden">
      {tabs.map((tab) => {
        const active = tab.route === currentRoute;
        return (
          <button
            key={tab.route}
            type="button"
            onClick={() => onNavigate(tab.route)}
            className={`flex flex-col items-center gap-1 transition-all ${active ? "text-slate-900" : "text-slate-400 hover:text-slate-500"
              }`}
          >
            <div className={`flex h-10 w-14 items-center justify-center rounded-2xl transition-all ${active ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "hover:bg-slate-50"
              }`}>
              <TabIcon name={tab.iconName} active={active} />
            </div>
            <span className={`text-[10px] font-extrabold uppercase tracking-widest ${active ? "opacity-100" : "opacity-60"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function TabIcon({ name, active }: { name: TabIconName; active: boolean }) {
  const strokeWidth = active ? 2.5 : 2;
  switch (name) {
    case "home":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "history":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "profile":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
  }
}
