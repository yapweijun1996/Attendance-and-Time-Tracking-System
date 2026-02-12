interface DbJsonEditorPanelProps {
  selectedId: string | null;
  editorText: string;
  readOnlyMode: boolean;
  saving: boolean;
  pendingDeleteId: string | null;
  deleteConfirmInput: string;
  onEditorTextChange: (value: string) => void;
  onSave: () => void;
  onRequestDelete: () => void;
  onDeleteConfirmInputChange: (value: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export default function DbJsonEditorPanel({
  selectedId,
  editorText,
  readOnlyMode,
  saving,
  pendingDeleteId,
  deleteConfirmInput,
  onEditorTextChange,
  onSave,
  onRequestDelete,
  onDeleteConfirmInputChange,
  onConfirmDelete,
  onCancelDelete,
}: DbJsonEditorPanelProps) {
  return (
    // Right panel handles raw JSON editing and destructive-action confirmation.
    <div className="ui-card p-4 lg:col-span-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="ui-title text-sm">JSON Editor</h2>
        <span className="ui-note-xs">{selectedId ?? "No doc selected"}</span>
      </div>
      <textarea
        value={editorText}
        onChange={(event) => onEditorTextChange(event.target.value)}
        readOnly={readOnlyMode}
        className="min-h-[60vh] w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none focus:ring-4 focus:ring-slate-100"
        placeholder='Click "Refresh DB" and open a document.'
        spellCheck={false}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!editorText || saving || readOnlyMode}
          className="ui-btn ui-btn-success disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save JSON"}
        </button>
        <button
          type="button"
          onClick={onRequestDelete}
          disabled={!editorText || saving || readOnlyMode}
          className="ui-btn ui-btn-danger disabled:cursor-not-allowed disabled:opacity-60"
        >
          Request Delete
        </button>
      </div>
      {pendingDeleteId ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-semibold text-rose-800">
            Delete confirm required. Type exact _id:
          </p>
          <p className="mt-1 break-all font-mono text-xs text-rose-700">{pendingDeleteId}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={deleteConfirmInput}
              onChange={(event) => onDeleteConfirmInputChange(event.target.value)}
              className="ui-input mt-0 max-w-md"
              placeholder="Type exact _id to confirm delete"
            />
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={saving}
              className="ui-btn ui-btn-danger disabled:cursor-not-allowed disabled:opacity-60"
            >
              Confirm Delete
            </button>
            <button type="button" onClick={onCancelDelete} className="ui-btn ui-btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
