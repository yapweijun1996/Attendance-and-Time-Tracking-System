import { useCallback, useState } from "react";

import { authenticateStaff, changeStaffPassword } from "../../services/staff-master";
import type { EnrollStatus } from "../types";
import type { VerificationResult } from "../types";
import { navigateTo } from "../router";
import { bindStaffId, bindStaffIdWithValidation, clearBoundStaffId } from "../services/staff-binding";
import {
  clearStaffSession,
  createStaffSession,
  readStaffSession,
  refreshStaffSession,
  type StaffSession,
} from "../services/staff-session";

interface UseStaffAccessOptions {
  refreshEnrollment: () => Promise<void>;
  refreshRecentEvents: () => Promise<void>;
  setAppError: (value: string | null) => void;
  setAppNotice: (value: string | null) => void;
  setStaffBound: (value: boolean) => void;
  setStaffId: (value: string | null) => void;
  setStaffName: (value: string | null) => void;
  setEnrollStatus: (value: EnrollStatus) => void;
  setDescriptorCount: (value: number) => void;
  setLastResult: (value: VerificationResult | null) => void;
}

export function useStaffAccess(options: UseStaffAccessOptions) {
  const {
    refreshEnrollment,
    refreshRecentEvents,
    setAppError,
    setAppNotice,
    setStaffBound,
    setStaffId,
    setStaffName,
    setEnrollStatus,
    setDescriptorCount,
    setLastResult,
  } = options;
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => readStaffSession());

  const refreshSessionState = useCallback(async () => {
    const nextSession = await refreshStaffSession();
    setStaffSession(nextSession);
    if (nextSession) {
      bindStaffId(nextSession.staffId);
      return;
    }
    clearBoundStaffId();
  }, []);

  const handleStaffLogin = useCallback(
    async (payload: { staffId: string; password: string }) => {
      const staff = await authenticateStaff(payload);
      const mustChangePassword = staff.credentials?.mustChangePassword ?? true;
      const session = createStaffSession({ staffId: staff.staffId, name: staff.name }, mustChangePassword);
      bindStaffId(staff.staffId);
      setStaffSession(session);
      setAppError(null);
      setAppNotice(`Welcome ${staff.name}.`);
      await Promise.all([refreshRecentEvents(), refreshEnrollment()]);
      navigateTo(mustChangePassword ? "/m/change-password" : "/m/home", true);
    },
    [refreshEnrollment, refreshRecentEvents, setAppError, setAppNotice]
  );

  const handleStaffPasswordChange = useCallback(
    async (payload: { currentPassword: string; newPassword: string }) => {
      if (!staffSession) {
        throw new Error("Session expired. Please sign in again.");
      }
      const updated = await changeStaffPassword({
        staffId: staffSession.staffId,
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      });
      const nextSession = createStaffSession({ staffId: updated.staffId, name: updated.name }, false);
      bindStaffId(updated.staffId);
      setStaffSession(nextSession);
      setAppError(null);
      setAppNotice("Password updated. Attendance features are now enabled.");
      await refreshEnrollment();
      navigateTo("/m/home", true);
    },
    [refreshEnrollment, setAppError, setAppNotice, staffSession]
  );

  const handleStaffLogout = useCallback(() => {
    clearStaffSession();
    clearBoundStaffId();
    setStaffSession(null);
    setStaffBound(false);
    setStaffId(null);
    setStaffName(null);
    setEnrollStatus("PENDING_CONSENT");
    setDescriptorCount(0);
    setLastResult(null);
    setAppError(null);
    setAppNotice("Signed out.");
    navigateTo("/login?role=staff", true);
  }, [
    setAppError,
    setAppNotice,
    setDescriptorCount,
    setEnrollStatus,
    setLastResult,
    setStaffBound,
    setStaffId,
    setStaffName,
  ]);

  const handleBindStaff = useCallback(async (nextStaffId: string) => {
    if (!staffSession) {
      setAppError("Sign in is required before binding staff.");
      return;
    }
    const normalized = nextStaffId.trim().toUpperCase();
    if (normalized !== staffSession.staffId) {
      setAppError("You can only bind the currently signed-in Staff ID.");
      return;
    }
    try {
      const staff = await bindStaffIdWithValidation(normalized);
      setAppError(null);
      setAppNotice(`Bound to ${staff.staffId} (${staff.name}).`);
      await refreshEnrollment();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Failed to bind staff.");
    }
  }, [refreshEnrollment, setAppError, setAppNotice, staffSession]);

  const handleClearStaffBinding = useCallback(async () => {
    clearBoundStaffId();
    setEnrollStatus("PENDING_CONSENT");
    setDescriptorCount(0);
    setStaffBound(false);
    setStaffId(null);
    setStaffName(null);
    setAppNotice("Staff binding cleared. Re-bind your own Staff ID.");
    await refreshEnrollment();
  }, [refreshEnrollment, setAppNotice, setDescriptorCount, setEnrollStatus, setStaffBound, setStaffId, setStaffName]);

  return {
    staffSession,
    refreshSessionState,
    handleStaffLogin,
    handleStaffPasswordChange,
    handleStaffLogout,
    handleBindStaff,
    handleClearStaffBinding,
  };
}
