import { useMemo, useState } from "react";

import SyncBadge from "../../mobile/components/SyncBadge";
import type { AttendanceAction, GeoStatus, RecentEvent } from "../../mobile/types";

interface LogsPageProps {
  recentEvents: RecentEvent[];
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
                <th className="ui-th">Event ID</th>
                <th className="ui-th">Action</th>
                <th className="ui-th">Client Time</th>
                <th className="ui-th">Geo</th>
                <th className="ui-th">Sync</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="ui-row">
                  <td className="ui-td font-mono text-xs text-slate-600">{event.id}</td>
                  <td className="ui-td font-semibold text-slate-900">{event.action}</td>
                  <td className="ui-td text-slate-700">
                    {new Date(event.clientTs).toLocaleString()}
                  </td>
                  <td className="ui-td text-slate-700">{event.geoStatus}</td>
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
              <p className="ui-title mt-1 text-sm">
                {event.action} · {event.geoStatus}
              </p>
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
