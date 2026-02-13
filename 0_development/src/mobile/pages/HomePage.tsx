import ActionButtonPair from "../components/ActionButtonPair";
import DesktopSidebar from "../components/DesktopSidebar";
import MobileTabBar from "../components/MobileTabBar";
import TopStatusBar from "../components/TopStatusBar";
import type { MobileRoute } from "../router";
import type { AttendanceAction, EnrollStatus, RecentEvent, SyncState } from "../types";

interface HomePageProps {
  currentRoute: MobileRoute;
  dbReady: boolean;
  enrollStatus: EnrollStatus;
  staffBound: boolean;
  staffName: string | null;
  online: boolean;
  latestSyncState: SyncState;
  recentEvents: RecentEvent[];
  onAction: (action: AttendanceAction) => void;
  onStartEnrollment: () => void;
  onNavigate: (route: MobileRoute) => void;
}

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  day: "2-digit",
});

export default function HomePage({
  currentRoute,
  dbReady,
  enrollStatus,
  staffBound,
  staffName,
  online,
  latestSyncState,
  recentEvents,
  onAction,
  onStartEnrollment,
  onNavigate,
}: HomePageProps) {
  const actionDisabled = !dbReady || !staffBound || enrollStatus !== "ACTIVE";
  const displayName = staffName ?? "Staff";

  return (
    <div className="min-h-screen bg-slate-50/30 font-sans">
      {/* ERP Standard Desktop Sidebar */}
      <DesktopSidebar
        currentRoute={currentRoute}
        staffName={staffName}
        onNavigate={onNavigate}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-32 sm:px-8 lg:pb-8 lg:pl-72">
        <header className="mb-10 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Hello, <span className="text-emerald-600">{displayName}</span>
            </h1>
            <p className="text-sm font-bold text-slate-400">Ready to record your workspace attendance?</p>
          </div>
          <div className="hidden lg:flex h-12 w-12 rounded-2xl bg-slate-900 items-center justify-center text-white text-xs font-black shadow-lg">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
        </header>

        <section className="mb-10">
          <TopStatusBar dbReady={dbReady} online={online} syncState={latestSyncState} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Actions & Status */}
          <div className="lg:col-span-7 space-y-8">
            <section className="ui-card p-0">
              <div className="border-b border-slate-50 bg-slate-50/30 px-6 py-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Workspace Console</h2>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${actionDisabled ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className="text-[11px] font-bold text-slate-500">{actionDisabled ? 'Action Required' : 'Ready'}</span>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <ActionButtonPair disabled={actionDisabled} onAction={onAction} />
                </div>

                {actionDisabled && (
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 border border-amber-100/50 shadow-sm">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-amber-900 leading-tight">
                          {staffBound ? "Face Enrollment Missing" : "Staff Binding Required"}
                        </h3>
                        <p className="text-sm text-amber-700/80 mt-1 font-medium">
                          {staffBound
                            ? "Please register your face profile to enable clock-in/out features."
                            : "Bind a valid staff ID in Profile before enrollment and attendance."}
                        </p>
                        <button
                          type="button"
                          onClick={onStartEnrollment}
                          className="mt-4 px-6 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                          Setup Biometrics Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <div className="ui-card p-5 bg-emerald-50/30 border-emerald-100/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Weekly Ratio</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-emerald-900">98%</span>
                  <span className="text-xs font-bold text-emerald-600">+2%</span>
                </div>
              </div>
              <div className="ui-card p-5 bg-blue-50/30 border-blue-100/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Total Hours</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-blue-900">38.5</span>
                  <span className="text-xs font-bold text-blue-600">h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity Feed */}
          <section className="lg:col-span-5 ui-card flex flex-col h-full overflow-hidden">
            <div className="border-b border-slate-50 bg-slate-50/30 px-6 py-4 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Activity Log</h2>
              <button
                onClick={() => onNavigate("/m/history")}
                className="text-xs font-bold text-slate-900 hover:text-emerald-600 transition-colors py-1 px-3 rounded-lg hover:bg-slate-100"
              >
                View Analytics
              </button>
            </div>

            <div className="p-6 flex-1">
              <ul className="space-y-6">
                {recentEvents.length > 0 ? (
                  recentEvents.slice(0, 5).map((event) => (
                    <li key={event.id} className="group relative flex gap-5 items-start">
                      <div className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-xs shadow-sm transition-transform group-hover:scale-110 ${event.action === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}>
                        {event.action}
                      </div>
                      <div className="flex-1 min-w-0 border-b border-slate-50 pb-4 group-last:border-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-extrabold text-slate-900">{event.action === "IN" ? "Clocked In" : "Clocked Out"}</p>
                          <span className="text-[10px] font-black tracking-tight text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {timestampFormatter.format(new Date(event.clientTs))}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500/80">
                          {event.geoStatus.replace(/_/g, " ")} · {event.syncState.replace(/_/g, " ")}
                        </p>
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                      <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Activity Yet</p>
                  </div>
                )}
              </ul>
            </div>
          </section>
        </div>
      </main>

      <MobileTabBar currentRoute={currentRoute} onNavigate={onNavigate} />
    </div>
  );
}
