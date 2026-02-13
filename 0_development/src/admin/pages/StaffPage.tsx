import { useCallback, useEffect, useState } from "react";

import StaffCreateForm from "../components/staff/StaffCreateForm";
import StaffDeleteDialog from "../components/staff/StaffDeleteDialog";
import StaffEditDialog from "../components/staff/StaffEditDialog";
import StaffResetPasswordForm from "../components/staff/StaffResetPasswordForm";
import StaffTable from "../components/staff/StaffTable";
import {
  deleteStaffProfile,
  exportStaffDeleteBundle,
  inspectStaffDeleteImpact,
  updateStaffProfile,
  type StaffDeleteExportBundle,
  type StaffDeleteImpact,
} from "../../services/staff-admin";
import {
  createStaffProfile,
  listStaffProfiles,
  resetStaffPassword,
  updateStaffStatus,
} from "../../services/staff-master";
import type { StaffProfile, StaffStatus } from "../../types/domain";

export default function StaffPage() {
  const [staffRows, setStaffRows] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [resetStaffId, setResetStaffId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffProfile | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<StaffDeleteImpact | null>(null);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteImpactError, setDeleteImpactError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshStaff = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listStaffProfiles(200);
      setStaffRows(rows);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStaff();
  }, [refreshStaff]);

  const handleCreateStaff = useCallback(async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await createStaffProfile({
        staffId,
        name,
        dept,
        initialPassword,
      });
      setStaffId("");
      setName("");
      setDept("");
      setInitialPassword("");
      setSuccessMessage(`Staff ${created.staffId} created. Share Staff ID + temporary password for first login.`);
      await refreshStaff();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create staff.");
    } finally {
      setSaving(false);
    }
  }, [dept, initialPassword, name, refreshStaff, staffId]);

  const handleResetPassword = useCallback(async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await resetStaffPassword(resetStaffId, resetPassword, true);
      setResetStaffId("");
      setResetPassword("");
      setSuccessMessage(`Password reset for ${updated.staffId}. User must change password at next login.`);
      await refreshStaff();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to reset password.");
    } finally {
      setSaving(false);
    }
  }, [refreshStaff, resetPassword, resetStaffId]);

  const handleToggleLock = useCallback(async (row: StaffProfile) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const nextStatus: StaffStatus = row.status === "LOCKED" ? "PENDING_ENROLL" : "LOCKED";
      await updateStaffStatus(row.staffId, nextStatus);
      setSuccessMessage(`Staff ${row.staffId} updated to ${nextStatus}.`);
      await refreshStaff();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update staff.");
    }
  }, [refreshStaff]);

  const handleEditProfile = useCallback(async (payload: { staffId: string; name: string; dept: string }) => {
    setEditing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await updateStaffProfile({
        staffId: payload.staffId,
        name: payload.name,
        dept: payload.dept,
      });
      setEditingStaff(null);
      setSuccessMessage(`Staff ${updated.staffId} profile updated.`);
      await refreshStaff();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update staff profile.");
      throw error;
    } finally {
      setEditing(false);
    }
  }, [refreshStaff]);

  const handleDeleteStaff = useCallback(async (staffIdToDelete: string) => {
    setDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteStaffProfile(staffIdToDelete);
      setDeletingStaff(null);
      setSuccessMessage(`Staff ${staffIdToDelete} deleted.`);
      await refreshStaff();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete staff.");
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [refreshStaff]);

  const handleOpenDeleteDialog = useCallback(async (row: StaffProfile) => {
    setDeletingStaff(row);
    setDeleteImpact(null);
    setDeleteImpactError(null);
    setDeleteImpactLoading(true);
    try {
      const impact = await inspectStaffDeleteImpact(row.staffId);
      setDeleteImpact(impact);
    } catch (error) {
      setDeleteImpactError(error instanceof Error ? error.message : "Failed to inspect related records.");
    } finally {
      setDeleteImpactLoading(false);
    }
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeletingStaff(null);
    setDeleteImpact(null);
    setDeleteImpactError(null);
    setDeleteImpactLoading(false);
  }, []);

  const handleExportDeleteBundle = useCallback(async (staffIdToExport: string): Promise<StaffDeleteExportBundle> => {
    return exportStaffDeleteBundle(staffIdToExport);
  }, []);

  return (
    <div className="space-y-4">
      <section className="ui-card p-4">
        <h2 className="ui-title text-sm">Staff Master</h2>
        <p className="ui-note mt-1">
          Create staff credentials here. Staff must sign in with Staff ID + password on mobile.
        </p>
        {errorMessage ? <p className="ui-note-error mt-2">{errorMessage}</p> : null}
        {successMessage ? <p className="ui-note mt-2 text-emerald-700">{successMessage}</p> : null}
      </section>

      <StaffCreateForm
        staffId={staffId}
        name={name}
        dept={dept}
        initialPassword={initialPassword}
        saving={saving}
        onStaffIdChange={setStaffId}
        onNameChange={setName}
        onDeptChange={setDept}
        onInitialPasswordChange={setInitialPassword}
        onSubmit={() => {
          void handleCreateStaff();
        }}
      />

      <StaffResetPasswordForm
        staffId={resetStaffId}
        resetPassword={resetPassword}
        saving={saving}
        onStaffIdChange={setResetStaffId}
        onResetPasswordChange={setResetPassword}
        onSubmit={() => {
          void handleResetPassword();
        }}
      />

      <StaffTable
        rows={staffRows}
        loading={loading}
        onEdit={(row) => {
          setEditingStaff(row);
        }}
        onToggleLock={(row) => {
          void handleToggleLock(row);
        }}
        onDelete={(row) => {
          void handleOpenDeleteDialog(row);
        }}
      />

      <StaffEditDialog
        key={editingStaff?.staffId ?? "no-staff"}
        staff={editingStaff}
        saving={editing}
        onClose={() => setEditingStaff(null)}
        onSubmit={handleEditProfile}
      />

      <StaffDeleteDialog
        key={deletingStaff?.staffId ?? "no-delete"}
        staff={deletingStaff}
        deleting={deleting}
        impact={deleteImpact}
        impactLoading={deleteImpactLoading}
        impactError={deleteImpactError}
        onClose={handleCloseDeleteDialog}
        onExport={handleExportDeleteBundle}
        onConfirm={handleDeleteStaff}
      />
    </div>
  );
}
