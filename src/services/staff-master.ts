import type { StaffProfile, StaffStatus } from "../types/domain";

const DEFAULT_ORG_ID = "org_01";
type StaffDoc = StaffProfile & Record<string, unknown>;

export interface CreateStaffInput {
  staffId: string;
  name: string;
  dept?: string;
}

function isNotFoundError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as { status?: number; name?: string };
  return candidate.status === 404 || candidate.name === "not_found";
}

function isConflictError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as { status?: number; name?: string };
  return candidate.status === 409 || candidate.name === "conflict";
}

function normalizeStaffId(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDept(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function validateStaffInput(input: CreateStaffInput): void {
  const staffId = normalizeStaffId(input.staffId);
  const name = normalizeName(input.name);
  if (!/^[A-Z0-9_-]{3,32}$/.test(staffId)) {
    throw new Error("Staff ID must be 3-32 chars using A-Z, 0-9, _, -.");
  }
  if (name.length < 2) {
    throw new Error("Staff name must be at least 2 characters.");
  }
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function createStaffDocId(staffId: string): string {
  return `staff::${normalizeStaffId(staffId)}`;
}

async function getDatabase() {
  const { pouchDBService } = await import("./db");
  pouchDBService.init();
  return pouchDBService.getDatabase();
}

export async function listStaffProfiles(limit = 200): Promise<StaffProfile[]> {
  const database = await getDatabase();
  const response = await database.allDocs({
    include_docs: true,
  });

  const staffList: StaffProfile[] = [];
  for (const row of response.rows) {
    const doc = row.doc as Partial<StaffDoc> | undefined;
    if (!doc || doc.type !== "STAFF") {
      continue;
    }
    if (typeof doc.staffId !== "string" || typeof doc.name !== "string") {
      continue;
    }
    staffList.push(doc as StaffProfile);
  }

  return staffList
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
    .slice(0, limit);
}

export async function loadStaffProfile(staffId: string): Promise<StaffProfile | null> {
  const database = await getDatabase();
  try {
    return await database.get<StaffDoc>(createStaffDocId(staffId));
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function createStaffProfile(input: CreateStaffInput): Promise<StaffProfile> {
  validateStaffInput(input);
  const database = await getDatabase();
  const normalizedId = normalizeStaffId(input.staffId);
  const now = new Date().toISOString();
  const doc: StaffDoc = {
    _id: createStaffDocId(normalizedId),
    type: "STAFF",
    orgId: DEFAULT_ORG_ID,
    staffId: normalizedId,
    name: normalizeName(input.name),
    dept: normalizeDept(input.dept),
    status: "PENDING_ENROLL",
    createdAt: now,
    updatedAt: now,
  };

  try {
    const response = await database.put(doc);
    return {
      ...doc,
      _rev: response.rev,
    };
  } catch (error) {
    if (isConflictError(error)) {
      throw new Error(`Staff ID ${normalizedId} already exists.`);
    }
    throw error;
  }
}

export async function updateStaffStatus(staffId: string, status: StaffStatus): Promise<StaffProfile> {
  const database = await getDatabase();
  const existing = await loadStaffProfile(staffId);
  if (!existing) {
    throw new Error(`Staff ${normalizeStaffId(staffId)} not found.`);
  }

  const nextDoc: StaffDoc = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  };
  const response = await database.put(nextDoc);
  return {
    ...nextDoc,
    _rev: response.rev,
  };
}
