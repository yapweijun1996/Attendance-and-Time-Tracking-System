import type { SystemAdminAccount } from "../types/domain";

const ADMIN_SESSION_STORAGE_KEY = "satts.admin.session";
const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export type AdminRole = "SUPER_ADMIN" | "ADMIN";

export interface AdminSession {
  adminId: string;
  name: string;
  email: string;
  role: AdminRole;
  issuedAt: string;
  expiresAt: string;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseSession(raw: string): AdminSession | null {
  try {
    const candidate = JSON.parse(raw) as Partial<AdminSession>;
    const role = candidate.role;
    const isValidRole = role === "SUPER_ADMIN" || role === "ADMIN";
    if (
      typeof candidate.adminId === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.email === "string" &&
      isValidRole &&
      typeof candidate.issuedAt === "string" &&
      typeof candidate.expiresAt === "string"
    ) {
      return {
        adminId: candidate.adminId,
        name: candidate.name,
        email: candidate.email,
        role,
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

function writeSession(session: AdminSession): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function createAdminSession(
  admin: Pick<SystemAdminAccount, "adminId" | "name" | "email" | "role">,
  ttlMs = DEFAULT_SESSION_TTL_MS
): AdminSession {
  const now = new Date();
  const session: AdminSession = {
    adminId: admin.adminId,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };

  writeSession(session);
  return session;
}

export function readAdminSession(): AdminSession | null {
  if (!canUseStorage()) {
    return null;
  }
  const raw = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const session = parseSession(raw);
  if (!session) {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    return null;
  }
  if (isExpired(session.expiresAt)) {
    const renewed: AdminSession = {
      ...session,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString(),
    };
    writeSession(renewed);
    return renewed;
  }

  const remainingMs = Date.parse(session.expiresAt) - Date.now();
  if (remainingMs < DEFAULT_SESSION_TTL_MS / 2) {
    const renewed: AdminSession = {
      ...session,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString(),
    };
    writeSession(renewed);
    return renewed;
  }

  return session;
}

export function clearAdminSession(): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
}
