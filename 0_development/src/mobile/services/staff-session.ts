import type { StaffProfile } from "../../types/domain";
import { loadStaffProfile } from "../../services/staff-master";

const STAFF_SESSION_STORAGE_KEY = "satts.mobile.staff.session";
const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface StaffSession {
  staffId: string;
  name: string;
  mustChangePassword: boolean;
  issuedAt: string;
  expiresAt: string;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseSession(raw: string): StaffSession | null {
  try {
    const candidate = JSON.parse(raw) as Partial<StaffSession>;
    if (
      typeof candidate.staffId === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.mustChangePassword === "boolean" &&
      typeof candidate.issuedAt === "string" &&
      typeof candidate.expiresAt === "string"
    ) {
      return {
        staffId: candidate.staffId,
        name: candidate.name,
        mustChangePassword: candidate.mustChangePassword,
        issuedAt: candidate.issuedAt,
        expiresAt: candidate.expiresAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function isExpired(isoDateTime: string): boolean {
  const expiresAtMs = Date.parse(isoDateTime);
  if (!Number.isFinite(expiresAtMs)) {
    return true;
  }
  return Date.now() >= expiresAtMs;
}

function writeSession(session: StaffSession): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(STAFF_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function buildSession(
  staff: Pick<StaffProfile, "staffId" | "name">,
  mustChangePassword: boolean,
  ttlMs: number
): StaffSession {
  const now = new Date();
  return {
    staffId: staff.staffId,
    name: staff.name,
    mustChangePassword,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
}

export function createStaffSession(
  staff: Pick<StaffProfile, "staffId" | "name">,
  mustChangePassword: boolean,
  ttlMs = DEFAULT_SESSION_TTL_MS
): StaffSession {
  const session = buildSession(staff, mustChangePassword, ttlMs);
  writeSession(session);
  return session;
}

export function readStaffSession(): StaffSession | null {
  if (!canUseStorage()) {
    return null;
  }
  const raw = window.localStorage.getItem(STAFF_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const session = parseSession(raw);
  if (!session) {
    window.localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
    return null;
  }
  if (isExpired(session.expiresAt)) {
    // Keep refresh experience stable: renew expired session on next read.
    const renewed = buildSession(
      { staffId: session.staffId, name: session.name },
      session.mustChangePassword,
      DEFAULT_SESSION_TTL_MS
    );
    writeSession(renewed);
    return renewed;
  }

  const remainingMs = Date.parse(session.expiresAt) - Date.now();
  if (remainingMs < DEFAULT_SESSION_TTL_MS / 2) {
    const renewed = buildSession(
      { staffId: session.staffId, name: session.name },
      session.mustChangePassword,
      DEFAULT_SESSION_TTL_MS
    );
    writeSession(renewed);
    return renewed;
  }

  return session;
}

export function clearStaffSession(): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
}

export async function refreshStaffSession(): Promise<StaffSession | null> {
  const session = readStaffSession();
  if (!session) {
    return null;
  }

  const staff = await loadStaffProfile(session.staffId);
  if (!staff || staff.status === "LOCKED") {
    clearStaffSession();
    return null;
  }

  const shouldForceChange = staff.credentials?.mustChangePassword ?? true;
  if (staff.name !== session.name || shouldForceChange !== session.mustChangePassword) {
    const remainingMs = Math.max(1, Date.parse(session.expiresAt) - Date.now());
    const nextSession = buildSession(
      { staffId: staff.staffId, name: staff.name },
      shouldForceChange,
      remainingMs
    );
    writeSession(nextSession);
    return nextSession;
  }

  return session;
}
