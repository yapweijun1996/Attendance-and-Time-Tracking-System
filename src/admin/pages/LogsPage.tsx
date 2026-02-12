import { useMemo, useState } from "react";

import SyncBadge from "../../mobile/components/SyncBadge";
import type { AttendanceAction, GeoStatus, RecentEvent } from "../../mobile/types";

interface LogsPageProps {
  recentEvents: RecentEvent[];
}

function actionTone(action: AttendanceAction): string {
  if (action === "IN") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  return "bg-sky-50 text-sky-700 ring-sky-200";
}

function geoTone(status: GeoStatus): string {
  if (status === "IN_RANGE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "OUT_OF_RANGE") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function geoLabel(status: GeoStatus): string {
  return status.replace(/_/g, " ");
}

export default function LogsPage({ recentEvents }: LogsPageProps) {
  const [actionFilter, setActionFilter] = useState<AttendanceAction | "ALL">("ALL");
  const [geoFilter, setGeoFilter] = useState<GeoStatus | "ALL">("ALL");

  const filteredEvents = useMemo(() => {
    return recentEvents.filter((event) => {
      const actionMatched = actionFilter === "ALL" || event.action === actionFilter;
      const geoMatched = geoFilter === "ALL" || event.geoStatus === geoFilter;
      return actionMatched && geoMatched;
    });
  }, [actionFilter, geoFilter, recentEvents]);

  return (
    <div className="space-y-4">
      <section className="ui-card p-4">
        <h2 className="ui-title text-sm">Filters</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="ui-note">
            Action
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as AttendanceAction | "ALL")}
              className="ui-input"
            >
              <option value="ALL">All</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </label>
          <label className="ui-note">
            Geo Status
            <select
              value={geoFilter}
              onChange={(event) => setGeoFilter(event.target.value as GeoStatus | "ALL")}
              className="ui-input"
            >
              <option value="ALL">All</option>
              <option value="IN_RANGE">IN_RANGE</option>
              <option value="OUT_OF_RANGE">OUT_OF_RANGE</option>
              <option value="LOCATION_UNAVAILABLE">LOCATION_UNAVAILABLE</option>
            </select>
          </label>
        </div>
      </section>

      <section className="ui-table-shell">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="ui-title text-sm">Attendance Logs</h2>
        </div>
        <div className="hidden lg:block">
          <table className="ui-table">
            <thead className="ui-thead">
              <tr>
                <th scope="col" className="ui-th">Event ID</th>
                <th scope="col" className="ui-th">Action</th>
                <th scope="col" className="ui-th">Client Time</th>
                <th scope="col" className="ui-th">Geo</th>
                <th scope="col" className="ui-th">Sync</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="ui-row">
                  <td className="ui-td font-mono text-xs text-slate-600">{event.id}</td>
                  <td className="ui-td">
                    <span className={`ui-pill ring-1 ${actionTone(event.action)}`}>{event.action}</span>
                  </td>
                  <td className="ui-td text-slate-700">
                    {new Date(event.clientTs).toLocaleString()}
                  </td>
                  <td className="ui-td">
                    <span className={`ui-pill ring-1 ${geoTone(event.geoStatus)}`}>{geoLabel(event.geoStatus)}</span>
                  </td>
                  <td className="ui-td">
                    <SyncBadge state={event.syncState} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 p-3 lg:hidden">
          {filteredEvents.map((event) => (
            <li key={event.id} className="ui-card-soft p-3">
              <p className="font-mono text-xs text-slate-500">{event.id}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`ui-pill ring-1 ${actionTone(event.action)}`}>{event.action}</span>
                <span className={`ui-pill ring-1 ${geoTone(event.geoStatus)}`}>{geoLabel(event.geoStatus)}</span>
              </div>
              <p className="ui-note-xs">{new Date(event.clientTs).toLocaleString()}</p>
              <div className="mt-2">
                <SyncBadge state={event.syncState} />
              </div>
            </li>
          ))}
        </ul>
        {filteredEvents.length === 0 ? (
          <p className="ui-note px-4 py-6">No logs matched current filters.</p>
        ) : null}
      </section>
    </div>
  );
}
