import { pouchDBService } from "./db";

export interface DbRecord extends Record<string, unknown> {
  _id: string;
  _rev?: string;
  type?: string;
}

function isNotFoundError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as { status?: number; name?: string };
  return candidate.status === 404 || candidate.name === "not_found";
}

function isRecord(value: unknown): value is DbRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<DbRecord>;
  return typeof candidate._id === "string";
}

async function getDatabase() {
  // Reuse app-level singleton to keep one IndexedDB handle in runtime.
  pouchDBService.init();
  return pouchDBService.getDatabase();
}

export async function listDbRecords(limit = 500): Promise<DbRecord[]> {
  const database = await getDatabase();
  const response = await database.allDocs({ include_docs: true, limit });
  const docs: DbRecord[] = [];
  for (const row of response.rows) {
    if (isRecord(row.doc)) {
      docs.push(row.doc);
    }
  }
  return docs.sort((left, right) => left._id.localeCompare(right._id));
}

export async function loadDbRecord(recordId: string): Promise<DbRecord | null> {
  const database = await getDatabase();
  try {
    const doc = await database.get<DbRecord>(recordId);
    return isRecord(doc) ? doc : null;
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function saveDbRecord(doc: DbRecord): Promise<DbRecord> {
  if (!doc._id || typeof doc._id !== "string") {
    throw new Error("Document must contain string _id.");
  }
  const database = await getDatabase();
  // PouchDB returns the new revision separately, merge it back for editor continuity.
  const response = await database.put(doc);
  return {
    ...doc,
    _rev: response.rev,
  };
}

export async function deleteDbRecord(doc: Pick<DbRecord, "_id" | "_rev">): Promise<void> {
  const database = await getDatabase();
  if (!doc._rev) {
    // If _rev is missing, fetch latest first to satisfy PouchDB delete contract.
    const latest = await database.get<DbRecord>(doc._id);
    await database.remove(latest);
    return;
  }
  await database.remove({
    _id: doc._id,
    _rev: doc._rev,
  });
}
