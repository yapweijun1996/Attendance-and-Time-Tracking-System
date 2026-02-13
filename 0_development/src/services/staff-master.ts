import type { StaffCredentials, StaffProfile, StaffStatus } from "../types/domain";

const DEFAULT_ORG_ID = "org_01";
type StaffDoc = StaffProfile & Record<string, unknown>;

export interface CreateStaffInput {
  staffId: string;
  name: string;
  dept?: string;
  initialPassword: string;
}

export interface AuthenticateStaffInput {
  staffId: string;
  password: string;
}

export interface ChangeStaffPasswordInput {
  staffId: string;
  currentPassword: string;
  newPassword: string;
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

function normalizePassword(value: string): string {
  return value.trim();
}

function validatePassword(password: string): void {
  if (password.length < 6 || password.length > 64) {
    throw new Error("Password must be 6-64 characters.");
  }
}

function validateStaffInput(input: CreateStaffInput): void {
  const staffId = normalizeStaffId(input.staffId);
  const name = normalizeName(input.name);
  const password = normalizePassword(input.initialPassword);
  if (!/^[A-Z0-9_-]{3,32}$/.test(staffId)) {
    throw new Error("Staff ID must be 3-32 chars using A-Z, 0-9, _, -.");
  }
  if (name.length < 2) {
    throw new Error("Staff name must be at least 2 characters.");
  }
  validatePassword(password);
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function hashPassword(password: string): Promise<string> {
  const payload = new TextEncoder().encode(password);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", payload);
    const hex = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    return `sha256:${hex}`;
  }
  const fallback = btoa(String.fromCharCode(...payload));
  return `base64:${fallback}`;
}

function ensureCredentials(staff: StaffProfile): StaffCredentials {
  if (!staff.credentials || typeof staff.credentials.passwordHash !== "string") {
    throw new Error(`Staff ${staff.staffId} has no password. Ask admin to reset password.`);
  }
  return staff.credentials;
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
  const normalizedPassword = normalizePassword(input.initialPassword);
  const now = new Date().toISOString();
  const doc: StaffDoc = {
    _id: createStaffDocId(normalizedId),
    type: "STAFF",
    orgId: DEFAULT_ORG_ID,
    staffId: normalizedId,
    name: normalizeName(input.name),
    dept: normalizeDept(input.dept),
    status: "PENDING_ENROLL",
    credentials: {
      passwordHash: await hashPassword(normalizedPassword),
      mustChangePassword: true,
      passwordChangedAt: now,
    },
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

export async function resetStaffPassword(
  staffId: string,
  nextPassword: string,
  mustChangePassword = true
): Promise<StaffProfile> {
  const database = await getDatabase();
  const existing = await loadStaffProfile(staffId);
  if (!existing) {
    throw new Error(`Staff ${normalizeStaffId(staffId)} not found.`);
  }
  const normalizedPassword = normalizePassword(nextPassword);
  validatePassword(normalizedPassword);

  const now = new Date().toISOString();
  const nextDoc: StaffDoc = {
    ...existing,
    credentials: {
      passwordHash: await hashPassword(normalizedPassword),
      mustChangePassword,
      passwordChangedAt: now,
    },
    updatedAt: now,
  };
  const response = await database.put(nextDoc);
  return {
    ...nextDoc,
    _rev: response.rev,
  };
}

export async function authenticateStaff(input: AuthenticateStaffInput): Promise<StaffProfile> {
  const normalizedId = normalizeStaffId(input.staffId);
  const normalizedPassword = normalizePassword(input.password);
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedId)) {
    throw new Error("Invalid staff ID format.");
  }
  validatePassword(normalizedPassword);

  const staff = await loadStaffProfile(normalizedId);
  if (!staff) {
    throw new Error("Invalid staff ID or password.");
  }
  if (staff.status === "LOCKED") {
    throw new Error(`Staff ${normalizedId} is locked. Contact admin.`);
  }

  const credentials = ensureCredentials(staff);
  const incomingHash = await hashPassword(normalizedPassword);
  if (incomingHash !== credentials.passwordHash) {
    throw new Error("Invalid staff ID or password.");
  }
  return staff;
}

export async function changeStaffPassword(input: ChangeStaffPasswordInput): Promise<StaffProfile> {
  const normalizedId = normalizeStaffId(input.staffId);
  const currentPassword = normalizePassword(input.currentPassword);
  const newPassword = normalizePassword(input.newPassword);
  validatePassword(currentPassword);
  validatePassword(newPassword);
  if (currentPassword === newPassword) {
    throw new Error("New password must be different from current password.");
  }

  const existing = await authenticateStaff({
    staffId: normalizedId,
    password: currentPassword,
  });
  const nextPasswordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  const database = await getDatabase();
  const nextDoc: StaffDoc = {
    ...existing,
    credentials: {
      passwordHash: nextPasswordHash,
      mustChangePassword: false,
      passwordChangedAt: now,
    },
    updatedAt: now,
  };

  const response = await database.put(nextDoc);
  return {
    ...nextDoc,
    _rev: response.rev,
  };
}
