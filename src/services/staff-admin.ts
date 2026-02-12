import type { StaffProfile } from "../types/domain";
import { createStaffDocId, loadStaffProfile } from "./staff-master";

export interface UpdateStaffProfileInput {
  staffId: string;
  name: string;
  dept?: string;
}

export interface StaffDeleteImpact {
  staffId: string;
  hasUserProfile: boolean;
  attendanceCount: number;
}

export interface StaffDeleteExportBundle {
  schemaVersion: "2026-02-12";
  staffId: string;
  exportedAt: string;
  staff: StaffProfile | null;
  userProfile: GenericDoc | null;
  attendanceLogs: GenericDoc[];
}

type StaffDoc = StaffProfile & Record<string, unknown>;
type GenericDoc = Record<string, unknown>;

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

function isNotFoundError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as { status?: number; name?: string };
  return candidate.status === 404 || candidate.name === "not_found";
}

async function getDatabase() {
  // Reuse app singleton DB handle so admin operations stay in one local runtime.
  const { pouchDBService } = await import("./db");
  pouchDBService.init();
  return pouchDBService.getDatabase();
}

function createUserProfileDocId(staffId: string): string {
  return `user::${normalizeStaffId(staffId)}`;
}

export async function updateStaffProfile(input: UpdateStaffProfileInput): Promise<StaffProfile> {
  const normalizedId = normalizeStaffId(input.staffId);
  const normalizedName = normalizeName(input.name);
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedId)) {
    throw new Error("Invalid staff ID format.");
  }
  if (normalizedName.length < 2) {
    throw new Error("Staff name must be at least 2 characters.");
  }

  const existing = await loadStaffProfile(normalizedId);
  if (!existing) {
    throw new Error(`Staff ${normalizedId} not found.`);
  }

  const database = await getDatabase();
  const nextDoc: StaffDoc = {
    ...existing,
    name: normalizedName,
    dept: normalizeDept(input.dept),
    updatedAt: new Date().toISOString(),
  };
  const response = await database.put(nextDoc);
  return {
    ...nextDoc,
    _rev: response.rev,
  };
}

export async function deleteStaffProfile(staffId: string): Promise<void> {
  const normalizedId = normalizeStaffId(staffId);
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedId)) {
    throw new Error("Invalid staff ID format.");
  }

  const database = await getDatabase();
  const existing = await database.get<StaffDoc>(createStaffDocId(normalizedId));
  await database.remove(existing);
}

export async function inspectStaffDeleteImpact(staffId: string): Promise<StaffDeleteImpact> {
  const normalizedId = normalizeStaffId(staffId);
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedId)) {
    throw new Error("Invalid staff ID format.");
  }

  const database = await getDatabase();

  let hasUserProfile = false;
  try {
    await database.get(createUserProfileDocId(normalizedId));
    hasUserProfile = true;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  const response = await database.allDocs({ include_docs: true });
  let attendanceCount = 0;
  for (const row of response.rows) {
    const doc = row.doc as GenericDoc | undefined;
    if (!doc) {
      continue;
    }
    if (doc.type === "ATTENDANCE_LOG" && doc.staffId === normalizedId) {
      attendanceCount += 1;
    }
  }

  return {
    staffId: normalizedId,
    hasUserProfile,
    attendanceCount,
  };
}

export async function exportStaffDeleteBundle(staffId: string): Promise<StaffDeleteExportBundle> {
  const normalizedId = normalizeStaffId(staffId);
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedId)) {
    throw new Error("Invalid staff ID format.");
  }

  const database = await getDatabase();
  const staff = await loadStaffProfile(normalizedId);

  let userProfile: GenericDoc | null = null;
  try {
    userProfile = await database.get<GenericDoc>(createUserProfileDocId(normalizedId));
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  const response = await database.allDocs({ include_docs: true });
  const attendanceLogs: GenericDoc[] = [];
  for (const row of response.rows) {
    const doc = row.doc as GenericDoc | undefined;
    if (!doc) {
      continue;
    }
    if (doc.type === "ATTENDANCE_LOG" && doc.staffId === normalizedId) {
      attendanceLogs.push(doc);
    }
  }

  return {
    schemaVersion: "2026-02-12",
    staffId: normalizedId,
    exportedAt: new Date().toISOString(),
    staff,
    userProfile,
    attendanceLogs,
  };
}
