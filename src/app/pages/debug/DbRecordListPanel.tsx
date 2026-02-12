import type { DbRecord } from "../../../services/db-inspector";

interface DbRecordListPanelProps {
  records: DbRecord[];
  filterText: string;
  selectedId: string | null;
  onFilterTextChange: (value: string) => void;
  onOpenRecord: (recordId: string) => void;
}

export default function DbRecordListPanel({
  records,
  filterText,
  selectedId,
  onFilterTextChange,
  onOpenRecord,
}: DbRecordListPanelProps) {
  return (
    // Left panel focuses on quick document lookup and selection.
    <div className="ui-card p-4 lg:col-span-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="ui-title text-sm">Documents</h2>
        <span className="ui-note-xs">{records.length}</span>
      </div>
      <input
        value={filterText}
        onChange={(event) => onFilterTextChange(event.target.value)}
        className="ui-input mt-0"
        placeholder="Filter by _id or type..."
      />
      <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {records.map((record) => (
          <li key={record._id}>
            <button
              type="button"
              onClick={() => onOpenRecord(record._id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                selectedId === record._id
                  ? "border-sky-300 bg-sky-50 text-sky-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <p className="font-mono font-semibold">{record._id}</p>
              <p className="mt-1 text-[10px] text-slate-500">{String(record.type ?? "UNKNOWN")}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
