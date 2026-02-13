import type { ReactNode } from "react";
import type { RecentEvent, SyncState } from "../../mobile/types";

interface DashboardPageProps {
  recentEvents: RecentEvent[];
}

interface StatusTone {
  text: string;
  pill: string;
}

const syncTone: Record<SyncState, StatusTone> = {
  LOCAL_ONLY: {
    text: "text-amber-600",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  SYNCING: {
    text: "text-sky-600",
    pill: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  SYNCED: {
    text: "text-emerald-600",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  FAILED: {
    text: "text-rose-600",
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

function countBySyncState(events: RecentEvent[]): Record<SyncState, number> {
  return events.reduce<Record<SyncState, number>>(
    (acc, event) => {
      acc[event.syncState] += 1;
      return acc;
    },
    {
      LOCAL_ONLY: 0,
      SYNCING: 0,
      SYNCED: 0,
      FAILED: 0,
    }
  );
}

export default function DashboardPage({ recentEvents }: DashboardPageProps) {
  const total = recentEvents.length;
  const inRange = recentEvents.filter((event) => event.geoStatus === "IN_RANGE").length;
  const outOfRange = recentEvents.filter((event) => event.geoStatus === "OUT_OF_RANGE").length;
  const locationUnavailable = recentEvents.filter((event) => event.geoStatus === "LOCATION_UNAVAILABLE").length;
  const syncStats = countBySyncState(recentEvents);

  return (
    <div className="space-y-8">
      {/* Primary Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Today Logs"
          value={total}
          icon={
            <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <MetricCard
          label="In Range"
          value={inRange}
          trend={`${Math.round((inRange / (total || 1)) * 100)}%`}
          colorClass="text-emerald-600"
          icon={
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Out Of Range"
          value={outOfRange}
          colorClass="text-rose-600"
          icon={
            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <MetricCard
          label="Pending Sync"
          value={syncStats.LOCAL_ONLY}
          colorClass="text-amber-600"
          icon={
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        />
        <MetricCard
          label="Location N/A"
          value={locationUnavailable}
          colorClass="text-slate-600"
          icon={
            <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14c1.2 0 1.96-1.3 1.35-2.35L13.35 4.35c-.6-1.05-2.1-1.05-2.7 0L3.58 16.65C2.97 17.7 3.73 19 4.93 19z" />
            </svg>
          }
        />
      </div>

      {/* Distribution Section */}
      <section className="ui-card flex flex-col overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="ui-title text-sm font-semibold text-slate-700">Storage & Sync Distribution</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatusIndicator label="Local Only" count={syncStats.LOCAL_ONLY} tone={syncTone.LOCAL_ONLY} />
            <StatusIndicator label="Syncing" count={syncStats.SYNCING} tone={syncTone.SYNCING} />
            <StatusIndicator label="Synced" count={syncStats.SYNCED} tone={syncTone.SYNCED} />
            <StatusIndicator label="Failed" count={syncStats.FAILED} tone={syncTone.FAILED} />
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  trend,
  colorClass = "text-slate-900",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  trend?: string;
  colorClass?: string;
}) {
  return (
    <article className="ui-card group p-6 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="rounded-xl bg-slate-50 p-2.5 transition-colors group-hover:bg-white">
          {icon}
        </div>
        {trend && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 shadow-sm">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="ui-kicker">{label}</p>
        <p className={`ui-title text-3xl ${colorClass}`}>{value}</p>
      </div>
    </article>
  );
}

function StatusIndicator({ label, count, tone }: { label: string; count: number; tone: StatusTone }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200 hover:shadow-md">
      <div className="mb-2">
        <span className={`ui-pill ring-1 ${tone.pill}`}>{label}</span>
      </div>
      <p className={`text-xl font-bold ${tone.text}`}>{count}</p>
    </div>
  );
}
