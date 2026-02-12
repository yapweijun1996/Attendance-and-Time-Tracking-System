import { useCallback, useEffect, useMemo, useState } from "react";

import DbJsonEditorPanel from "./debug/DbJsonEditorPanel";
import DbRecordListPanel from "./debug/DbRecordListPanel";
import type { AdminSession } from "../../services/admin-auth";
import {
  deleteDbRecord,
  listDbRecords,
  loadDbRecord,
  saveDbRecord,
  type DbRecord,
} from "../../services/db-inspector";
import { navigateTo } from "../../shared/navigation";

function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

interface DebugDatabasePageProps {
  adminSession: AdminSession | null;
}

export default function DebugDatabasePage({ adminSession }: DebugDatabasePageProps) {
  // Default to read-only mode to avoid accidental destructive writes.
  const [readOnlyMode, setReadOnlyMode] = useState(true);
  const [unlockTokenInput, setUnlockTokenInput] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [records, setRecords] = useState<DbRecord[]>([]);
  const [filterText, setFilterText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorText, setEditorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const unlockPhrase = "ENABLE_EDIT";
  const canWrite = adminSession?.role === "SUPER_ADMIN";
  const roleLabel = adminSession?.role ?? "NO_SESSION";

  useEffect(() => {
    if (canWrite) {
      return;
    }
    setReadOnlyMode(true);
    setUnlockTokenInput("");
    setPendingDeleteId(null);
    setDeleteConfirmInput("");
  }, [canWrite]);

  // Keep list filtering local and deterministic for predictable debug behavior.
  const filteredRecords = useMemo(() => {
    const keyword = filterText.trim().toLowerCase();
    if (!keyword) {
      return records;
    }
    return records.filter((record) => {
      const typeLabel = typeof record.type === "string" ? record.type.toLowerCase() : "";
      return record._id.toLowerCase().includes(keyword) || typeLabel.includes(keyword);
    });
  }, [filterText, records]);

  const refreshList = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await listDbRecords(800);
      setRecords(next);
      setNotice(`Loaded ${next.length} docs from IndexedDB.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to read database.");
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const openRecord = useCallback(async (recordId: string) => {
    setErrorMessage(null);
    try {
      const doc = await loadDbRecord(recordId);
      if (!doc) {
        setErrorMessage(`Doc ${recordId} not found.`);
        return;
      }
      setSelectedId(recordId);
      setEditorText(toPrettyJson(doc));
      setPendingDeleteId(null);
      setDeleteConfirmInput("");
      setNotice(`Opened ${recordId}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load doc.");
    }
  }, []);

  const createBlankDoc = useCallback(() => {
    const id = `doc::${Date.now()}`;
    const doc: DbRecord = {
      _id: id,
      type: "CUSTOM",
      createdAt: new Date().toISOString(),
    };
    setSelectedId(id);
    setEditorText(toPrettyJson(doc));
    setPendingDeleteId(null);
    setDeleteConfirmInput("");
    setNotice("Blank doc template generated. Edit JSON then click Save.");
    setErrorMessage(null);
  }, []);

  const saveCurrent = useCallback(async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const parsed = JSON.parse(editorText) as DbRecord;
      const saved = await saveDbRecord(parsed);
      setSelectedId(saved._id);
      setEditorText(toPrettyJson(saved));
      setNotice(`Saved ${saved._id}`);
      await refreshList();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save doc.");
      setNotice(null);
    } finally {
      setSaving(false);
    }
  }, [editorText, refreshList]);

  const deleteCurrent = useCallback(async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const parsed = JSON.parse(editorText) as DbRecord;
      await deleteDbRecord({
        _id: parsed._id,
        _rev: parsed._rev,
      });
      setNotice(`Deleted ${parsed._id}`);
      setSelectedId(null);
      setEditorText("");
      setPendingDeleteId(null);
      setDeleteConfirmInput("");
      await refreshList();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete doc.");
      setNotice(null);
    } finally {
      setSaving(false);
    }
  }, [editorText, refreshList]);

  const enableEditMode = useCallback(() => {
    if (!canWrite) {
      setErrorMessage("Write access is restricted to Super Admin.");
      return;
    }
    if (unlockTokenInput.trim() !== unlockPhrase) {
      setErrorMessage(`Type ${unlockPhrase} to enable edit mode.`);
      return;
    }
    setReadOnlyMode(false);
    setUnlockTokenInput("");
    setErrorMessage(null);
    setNotice("Edit mode enabled. Be careful with save/delete operations.");
  }, [canWrite, unlockPhrase, unlockTokenInput]);

  const disableEditMode = useCallback(() => {
    setReadOnlyMode(true);
    setPendingDeleteId(null);
    setDeleteConfirmInput("");
    setErrorMessage(null);
    setNotice("Switched to read-only mode.");
  }, []);

  const requestDelete = useCallback(() => {
    try {
      const parsed = JSON.parse(editorText) as DbRecord;
      if (!parsed._id) {
        setErrorMessage("Current JSON must include _id before delete.");
        return;
      }
      setPendingDeleteId(parsed._id);
      setDeleteConfirmInput("");
      setErrorMessage(null);
      setNotice(`Delete requested for ${parsed._id}. Type the exact _id to confirm.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invalid JSON.");
    }
  }, [editorText]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId) {
      return;
    }
    if (deleteConfirmInput.trim() !== pendingDeleteId) {
      setErrorMessage("Delete confirmation text does not match _id.");
      return;
    }
    await deleteCurrent();
  }, [deleteConfirmInput, deleteCurrent, pendingDeleteId]);

  const cancelDelete = useCallback(() => {
    setPendingDeleteId(null);
    setDeleteConfirmInput("");
  }, []);

  return (
    <div className="ui-shell">
      <main className="ui-container max-w-7xl space-y-4">
        <section className="ui-card p-4">
          <p className="ui-kicker">Debug</p>
          <h1 className="ui-title text-xl">IndexedDB Explorer</h1>
          <p className="ui-note mt-1">
            View and manage PouchDB documents directly (similar to phpMyAdmin style, JSON-level).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { void refreshList(); }} className="ui-btn ui-btn-primary">
              {loading ? "Loading..." : "Refresh DB"}
            </button>
            <button
              type="button"
              onClick={createBlankDoc}
              disabled={readOnlyMode || !canWrite}
              className="ui-btn ui-btn-ghost disabled:cursor-not-allowed disabled:opacity-60"
            >
              New Doc
            </button>
            {canWrite && readOnlyMode ? (
              <>
                <input
                  value={unlockTokenInput}
                  onChange={(event) => setUnlockTokenInput(event.target.value)}
                  className="ui-input mt-0 max-w-[12rem]"
                  placeholder={`Type ${unlockPhrase}`}
                />
                <button type="button" onClick={enableEditMode} className="ui-btn ui-btn-info">
                  Enable Edit Mode
                </button>
              </>
            ) : null}
            {canWrite && !readOnlyMode ? (
              <button type="button" onClick={disableEditMode} className="ui-btn ui-btn-danger">
                Lock Read-Only
              </button>
            ) : null}
            <button type="button" onClick={() => navigateTo("/debug/health")} className="ui-btn ui-btn-ghost">
              Back to Health
            </button>
          </div>
          <p className="ui-note mt-2">
            Mode: <strong>{readOnlyMode ? "READ-ONLY" : "EDIT ENABLED"}</strong>
          </p>
          <p className="ui-note mt-1">
            Session Role: <strong>{roleLabel}</strong> · Write Permission: <strong>{canWrite ? "ALLOWED" : "DENIED"}</strong>
          </p>
          {errorMessage ? <p className="ui-note-error mt-2">{errorMessage}</p> : null}
          {notice ? <p className="ui-note mt-2 text-emerald-700">{notice}</p> : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-12">
          <DbRecordListPanel
            records={filteredRecords}
            filterText={filterText}
            selectedId={selectedId}
            onFilterTextChange={setFilterText}
            onOpenRecord={(recordId) => {
              void openRecord(recordId);
            }}
          />
          <DbJsonEditorPanel
            selectedId={selectedId}
            editorText={editorText}
            readOnlyMode={readOnlyMode}
            saving={saving}
            pendingDeleteId={pendingDeleteId}
            deleteConfirmInput={deleteConfirmInput}
            onEditorTextChange={setEditorText}
            onSave={() => {
              void saveCurrent();
            }}
            onRequestDelete={requestDelete}
            onDeleteConfirmInputChange={setDeleteConfirmInput}
            onConfirmDelete={() => {
              void confirmDelete();
            }}
            onCancelDelete={cancelDelete}
          />
        </section>
      </main>
    </div>
  );
}
