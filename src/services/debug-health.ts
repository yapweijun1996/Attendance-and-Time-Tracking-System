import { readAdminSession } from "./admin-auth";
import { pouchDBService } from "./db";
import { loadSystemAdmin } from "./system-admin";

export type DebugCheckStatus = "PASS" | "WARN" | "FAIL";

export interface DebugCheckResult {
  id: string;
  label: string;
  status: DebugCheckStatus;
  detail: string;
  durationMs: number;
}

export interface DebugHealthReport {
  generatedAt: string;
  checks: DebugCheckResult[];
}

const CHECK_TIMEOUT_MS = 8000;

function runWithTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out.`));
    }, CHECK_TIMEOUT_MS);

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

async function runCheck(
  id: string,
  label: string,
  action: () => Promise<{ status: DebugCheckStatus; detail: string }>
): Promise<DebugCheckResult> {
  const startedAt = performance.now();
  try {
    const result = await action();
    return {
      id,
      label,
      status: result.status,
      detail: result.detail,
      durationMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      id,
      label,
      status: "FAIL",
      detail: error instanceof Error ? error.message : "Unknown error",
      durationMs: Math.round(performance.now() - startedAt),
    };
  }
}

async function checkIndexedDb(): Promise<{ status: DebugCheckStatus; detail: string }> {
  if (typeof indexedDB === "undefined") {
    return { status: "FAIL", detail: "indexedDB is unavailable." };
  }

  const probe = await runWithTimeout(
    new Promise<string>((resolve) => {
      const request = indexedDB.open("satts_probe_db", 1);
      request.onupgradeneeded = () => {};
      request.onsuccess = () => {
        request.result.close();
        resolve("open-ok");
      };
      request.onerror = () => resolve(`open-error:${request.error?.name ?? "unknown"}`);
      request.onblocked = () => resolve("blocked");
    }),
    "IndexedDB open"
  );

  if (probe === "open-ok") {
    return { status: "PASS", detail: "IndexedDB open successful." };
  }
  return { status: "FAIL", detail: `IndexedDB probe failed: ${probe}` };
}

async function checkLocalStorage(): Promise<{ status: DebugCheckStatus; detail: string }> {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return { status: "FAIL", detail: "localStorage unavailable." };
  }
  const key = `satts_probe::${Date.now()}`;
  window.localStorage.setItem(key, "ok");
  const value = window.localStorage.getItem(key);
  window.localStorage.removeItem(key);
  if (value === "ok") {
    return { status: "PASS", detail: "localStorage read/write successful." };
  }
  return { status: "FAIL", detail: "localStorage probe value mismatch." };
}

async function checkCrypto(): Promise<{ status: DebugCheckStatus; detail: string }> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return { status: "WARN", detail: "crypto.subtle unavailable. Fallback hash path may be used." };
  }
  const payload = new TextEncoder().encode("satts-crypto-probe");
  await runWithTimeout(crypto.subtle.digest("SHA-256", payload), "crypto.subtle.digest");
  return { status: "PASS", detail: "crypto.subtle digest successful." };
}

async function checkPouchDb(): Promise<{ status: DebugCheckStatus; detail: string }> {
  pouchDBService.init();
  const database = pouchDBService.getDatabase();
  const info = await runWithTimeout(database.info(), "PouchDB info");

  const probeId = `probe::${Date.now()}`;
  await runWithTimeout(
    database.put({
      _id: probeId,
      type: "DEBUG_PROBE",
      createdAt: new Date().toISOString(),
    }),
    "PouchDB put"
  );

  return {
    status: "PASS",
    detail: `PouchDB ready (name=${info.db_name}, doc_count=${info.doc_count}).`,
  };
}

async function checkSystemAdminDoc(): Promise<{ status: DebugCheckStatus; detail: string }> {
  const admin = await runWithTimeout(loadSystemAdmin(), "Load system admin");
  if (!admin) {
    return { status: "WARN", detail: "SYSTEM_ADMIN not found. Setup is expected." };
  }
  return { status: "PASS", detail: `SYSTEM_ADMIN found (${admin.email}).` };
}

async function checkAdminSessionState(): Promise<{ status: DebugCheckStatus; detail: string }> {
  const session = readAdminSession();
  if (!session) {
    return { status: "WARN", detail: "No active admin session." };
  }
  return {
    status: "PASS",
    detail: `Session active for ${session.email}, expires at ${session.expiresAt}.`,
  };
}

export async function runDebugHealthChecks(): Promise<DebugHealthReport> {
  const checks = await Promise.all([
    runCheck("indexeddb", "IndexedDB", checkIndexedDb),
    runCheck("localstorage", "localStorage", checkLocalStorage),
    runCheck("crypto", "Web Crypto", checkCrypto),
    runCheck("pouchdb", "PouchDB", checkPouchDb),
    runCheck("system-admin", "System Admin Doc", checkSystemAdminDoc),
    runCheck("admin-session", "Admin Session", checkAdminSessionState),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    checks,
  };
}
