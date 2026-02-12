import type { SystemAdminAccount } from "../types/domain";
import { pouchDBService } from "./db";

const DEFAULT_ORG_ID = "org_01";
const SYSTEM_ADMIN_DOC_ID = "system_admin::primary";
const ADMIN_OPERATION_TIMEOUT_MS = 12_000;
type SystemAdminDoc = SystemAdminAccount & Record<string, unknown>;

export interface RegisterSystemAdminInput {
  name: string;
  email: string;
  pin: string;
}

export interface AuthenticateSystemAdminInput {
  email: string;
  pin: string;
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

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function validateInput(input: RegisterSystemAdminInput): void {
  const name = normalizeName(input.name);
  const email = normalizeEmail(input.email);
  const pin = input.pin.trim();

  if (name.length < 2) {
    throw new Error("Admin name must be at least 2 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please provide a valid admin email.");
  }
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("PIN must be exactly 6 digits.");
  }
}

function validateLoginInput(input: AuthenticateSystemAdminInput): void {
  const email = normalizeEmail(input.email);
  const pin = input.pin.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please provide a valid admin email.");
  }
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("PIN must be exactly 6 digits.");
  }
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Please retry.`));
    }, ADMIN_OPERATION_TIMEOUT_MS);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

async function hashPin(pin: string): Promise<string> {
  const payload = new TextEncoder().encode(pin);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await withTimeout(
      crypto.subtle.digest("SHA-256", payload),
      "PIN hashing"
    );
    const hex = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    return `sha256:${hex}`;
  }
  const fallback = btoa(String.fromCharCode(...payload));
  return `base64:${fallback}`;
}

async function getDatabase() {
  pouchDBService.init();
  return pouchDBService.getDatabase();
}

export async function loadSystemAdmin(): Promise<SystemAdminAccount | null> {
  const database = await getDatabase();
  try {
    return await withTimeout(
      database.get<SystemAdminDoc>(SYSTEM_ADMIN_DOC_ID),
      "Load system admin"
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function hasSystemAdmin(): Promise<boolean> {
  const admin = await loadSystemAdmin();
  return admin !== null;
}

export async function registerSystemAdmin(input: RegisterSystemAdminInput): Promise<SystemAdminAccount> {
  validateInput(input);
  const database = await getDatabase();

  const now = new Date().toISOString();
  const normalizedName = normalizeName(input.name);
  const normalizedEmail = normalizeEmail(input.email);
  const doc: SystemAdminDoc = {
    _id: SYSTEM_ADMIN_DOC_ID,
    type: "SYSTEM_ADMIN",
    orgId: DEFAULT_ORG_ID,
    adminId: "admin_001",
    name: normalizedName,
    email: normalizedEmail,
    role: "SUPER_ADMIN",
    pinHash: await hashPin(input.pin.trim()),
    createdAt: now,
    lastLoginAt: now,
  };

  let response;
  try {
    response = await withTimeout(
      database.put(doc),
      "Create system admin"
    );
  } catch (error) {
    if (isConflictError(error)) {
      throw new Error("System admin already exists. Please sign in at /admin/login.");
    }
    throw error;
  }
  return {
    ...doc,
    _rev: response.rev,
  };
}

export async function authenticateSystemAdmin(
  input: AuthenticateSystemAdminInput
): Promise<SystemAdminAccount> {
  validateLoginInput(input);

  const admin = await loadSystemAdmin();
  if (!admin) {
    throw new Error("System admin not found. Complete setup first.");
  }

  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPin = input.pin.trim();
  const hash = await hashPin(normalizedPin);
  if (admin.email !== normalizedEmail || admin.pinHash !== hash) {
    throw new Error("Invalid email or PIN.");
  }

  const database = await getDatabase();
  const nextAdmin: SystemAdminDoc = {
    ...admin,
    lastLoginAt: new Date().toISOString(),
  };

  try {
    const response = await database.put(nextAdmin);
    return {
      ...nextAdmin,
      _rev: response.rev,
    };
  } catch {
    return admin;
  }
}
