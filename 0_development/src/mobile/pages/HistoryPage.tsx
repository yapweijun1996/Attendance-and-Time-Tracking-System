import DesktopSidebar from "../components/DesktopSidebar";
import MobileTabBar from "../components/MobileTabBar";
import SyncBadge from "../components/SyncBadge";
import type { MobileRoute } from "../router";
import type { RecentEvent } from "../types";

interface HistoryPageProps {
  currentRoute: MobileRoute;
  staffName: string | null;
  events: RecentEvent[];
  onNavigate: (route: MobileRoute) => void;
}

export default function HistoryPage({
  currentRoute,
  staffName,
  events,
  onNavigate
}: HistoryPageProps) {
  return (
    <div className="min-h-screen bg-slate-50/30">
      <DesktopSidebar
        currentRoute={currentRoute}
        staffName={staffName}
        onNavigate={onNavigate}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-32 sm:px-8 lg:pb-8 lg:pl-72">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Attendance History</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Detailed logs of your workspace clock-ins and clock-outs.</p>
        </header>

        <section className="ui-card bg-white p-0 overflow-hidden shadow-sm border-slate-100">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Activity Log ({events.length})</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="group flex items-center gap-6 p-6 hover:bg-slate-50/50 transition-colors">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-xs shadow-sm ${event.action === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    }`}>
                    {event.action}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-extrabold text-slate-900">{event.action === "IN" ? "Clocked In" : "Clocked Out"}</p>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {new Date(event.clientTs).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor font-bold">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event.geoStatus.replace(/_/g, " ")}
                      </span>
                      <SyncBadge state={event.syncState} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No history recorded yet</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <MobileTabBar currentRoute={currentRoute} onNavigate={onNavigate} />
    </div>
  );
}
