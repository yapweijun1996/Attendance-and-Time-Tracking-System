import type { StaffProfile } from "../../types/domain";
import { loadStaffProfile } from "../../services/staff-master";

const CURRENT_STAFF_ID_STORAGE_KEY = "satts.mobile.currentStaffId";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeStaffId(value: string): string {
  return value.trim().toUpperCase();
}

export function getBoundStaffId(): string | null {
  if (!canUseStorage()) {
    return null;
  }
  const value = window.localStorage.getItem(CURRENT_STAFF_ID_STORAGE_KEY);
  if (!value) {
    return null;
  }
  const normalized = normalizeStaffId(value);
  return normalized.length > 0 ? normalized : null;
}

export function bindStaffId(staffId: string): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(CURRENT_STAFF_ID_STORAGE_KEY, normalizeStaffId(staffId));
}

export function clearBoundStaffId(): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(CURRENT_STAFF_ID_STORAGE_KEY);
}

export async function resolveBoundStaffProfile(): Promise<StaffProfile | null> {
  const boundId = getBoundStaffId();
  if (boundId) {
    const staff = await loadStaffProfile(boundId);
    if (staff && staff.status !== "LOCKED") {
      return staff;
    }
    clearBoundStaffId();
    return null;
  }
  return null;
}

export async function bindStaffIdWithValidation(staffId: string): Promise<StaffProfile> {
  const normalizedId = normalizeStaffId(staffId);
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalizedId)) {
    throw new Error("Invalid staff ID format.");
  }
  const staff = await loadStaffProfile(normalizedId);
  if (!staff) {
    throw new Error(`Staff ID ${normalizedId} not found.`);
  }
  if (staff.status === "LOCKED") {
    throw new Error(`Staff ${normalizedId} is locked. Contact admin.`);
  }
  bindStaffId(staff.staffId);
  return staff;
}
