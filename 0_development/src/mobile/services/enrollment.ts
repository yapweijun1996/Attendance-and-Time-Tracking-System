import type {
  AttachmentMeta,
  EnrollStatus,
  StaffProfile,
  UserProfile,
} from "../../types/domain";
import { updateStaffStatus } from "../../services/staff-master";
import { resolveBoundStaffProfile } from "./staff-binding";

export const ENROLLMENT_CONSENT_VERSION = "2026-02-12";
export const ENROLLMENT_DESCRIPTOR_VERSION = "faceapi-v1";

const DEFAULT_ORG_ID = "org_01";
const DEFAULT_OFFICE_ID = "office_hq_01";

interface LivenessRecord {
  mode: "PASSIVE_SCORE";
  passedAt: string;
  confidence: number;
}

interface UserProfileDoc extends UserProfile {
  liveness?: LivenessRecord;
  _attachments?: Record<string, AttachmentMeta>;
}

export interface SaveEnrollmentInput {
  descriptors: number[][];
  photos: string[];
  consentAcceptedAt: string;
  liveness: LivenessRecord;
}

export interface EnrollmentSummary {
  status: EnrollStatus;
  descriptorCount: number;
  consentAcceptedAt: string | null;
  staffBound: boolean;
  staffId: string | null;
  staffName: string | null;
}

function isNotFoundError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as { status?: number; name?: string };
  return candidate.status === 404 || candidate.name === "not_found";
}

async function getDatabase() {
  const { pouchDBService } = await import("../../services/db");
  pouchDBService.init();
  return pouchDBService.getDatabase();
}

function createProfileId(staffId: string): string {
  return `user::${staffId}`;
}

function normalizeDescriptors(descriptors: number[][]): number[][] {
  const normalized = descriptors
    .map((descriptor) =>
      descriptor
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
    .filter((descriptor) => descriptor.length > 0);

  if (normalized.length === 0) {
    throw new Error("At least one valid descriptor is required for enrollment.");
  }

  return normalized;
}

function buildEnrollmentAttachments(photos: string[]): Record<string, AttachmentMeta> | undefined {
  const normalizedPhotos = photos
    .map((photo) => photo.trim())
    .filter((photo) => photo.length > 0);

  if (normalizedPhotos.length === 0) {
    return undefined;
  }

  const attachments: Record<string, AttachmentMeta> = {};
  for (let index = 0; index < normalizedPhotos.length; index += 1) {
    const attachmentName = `enroll_${String(index + 1).padStart(2, "0")}.jpg`;
    attachments[attachmentName] = {
      content_type: "image/jpeg",
      data: normalizedPhotos[index],
    };
  }
  return attachments;
}

export async function loadCurrentUserProfile(): Promise<UserProfileDoc | null> {
  const staff = await resolveBoundStaffProfile();
  if (!staff) {
    return null;
  }

  const database = await getDatabase();
  try {
    return await database.get<UserProfileDoc>(createProfileId(staff.staffId));
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function loadCurrentBoundStaffProfile(): Promise<StaffProfile | null> {
  return resolveBoundStaffProfile();
}

export async function loadEnrollmentSummary(): Promise<EnrollmentSummary> {
  const staff = await resolveBoundStaffProfile();
  if (!staff) {
    return {
      status: "PENDING_CONSENT",
      descriptorCount: 0,
      consentAcceptedAt: null,
      staffBound: false,
      staffId: null,
      staffName: null,
    };
  }

  const profile = await loadCurrentUserProfile();
  if (!profile) {
    return {
      status: "PENDING_CONSENT",
      descriptorCount: 0,
      consentAcceptedAt: null,
      staffBound: true,
      staffId: staff.staffId,
      staffName: staff.name,
    };
  }

  return {
    status: profile.enrollStatus,
    descriptorCount: profile.faceDescriptors.length,
    consentAcceptedAt: profile.consent?.acceptedAt ?? null,
    staffBound: true,
    staffId: staff.staffId,
    staffName: staff.name,
  };
}

export async function saveEnrollmentProfile(input: SaveEnrollmentInput): Promise<UserProfileDoc> {
  const staff = await resolveBoundStaffProfile();
  if (!staff) {
    throw new Error("No staff is bound to this device. Bind a valid staff ID first.");
  }

  const database = await getDatabase();
  const existing = await loadCurrentUserProfile();
  const descriptors = normalizeDescriptors(input.descriptors);
  const attachments = buildEnrollmentAttachments(input.photos);

  // Save descriptors + enrollment snapshots as document attachments for audit.
  const profileDoc: UserProfileDoc = {
    _id: createProfileId(staff.staffId),
    _rev: existing?._rev,
    type: "USER_PROFILE",
    orgId: DEFAULT_ORG_ID,
    staffId: staff.staffId,
    name: staff.name,
    dept: staff.dept,
    enrollStatus: "ACTIVE",
    descriptorVersion: ENROLLMENT_DESCRIPTOR_VERSION,
    faceDescriptors: descriptors,
    consent: {
      version: ENROLLMENT_CONSENT_VERSION,
      acceptedAt: input.consentAcceptedAt,
    },
    settings: {
      allowedOfficeId: DEFAULT_OFFICE_ID,
    },
    liveness: input.liveness,
    _attachments: attachments,
  };

  await database.put(profileDoc);
  await updateStaffStatus(staff.staffId, "ACTIVE");
  return profileDoc;
}
