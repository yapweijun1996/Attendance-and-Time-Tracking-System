export type ISODateTimeString = string;
export type UUID = string;
export type FaceDescriptor = number[];

export type DocumentType =
  | "SYSTEM_ADMIN"
  | "STAFF"
  | "USER_PROFILE"
  | "ATTENDANCE_LOG"
  | "OFFICE"
  | "POLICY_CONFIG"
  | "AUDIT_LOG";

export type EnrollStatus = "PENDING_CONSENT" | "ACTIVE" | "RESET_REQUIRED" | "LOCKED";

export type AttendanceAction = "IN" | "OUT";

export type SyncState = "LOCAL_ONLY" | "SYNCING" | "SYNCED" | "SYNC_FAILED";

export type GeoPolicyStatus = "IN_RANGE" | "OUT_OF_RANGE" | "LOCATION_UNAVAILABLE";

export type VerifyResult = "PASS" | "FAIL";

export interface DocMeta {
  _id: string;
  _rev?: string;
}

export interface ConsentRecord {
  version: string;
  acceptedAt: ISODateTimeString;
}

export interface UserSettings {
  allowedOfficeId?: string;
}

export interface UserProfile extends DocMeta {
  type: "USER_PROFILE";
  orgId: string;
  staffId: string;
  name: string;
  dept?: string;
  enrollStatus: EnrollStatus;
  descriptorVersion: string;
  faceDescriptors: FaceDescriptor[];
  consent?: ConsentRecord;
  settings?: UserSettings;
}

export type StaffStatus = "PENDING_ENROLL" | "ACTIVE" | "LOCKED";

export interface StaffProfile extends DocMeta {
  type: "STAFF";
  orgId: string;
  staffId: string;
  name: string;
  dept?: string;
  status: StaffStatus;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface VerifySnapshot {
  distance: number;
  threshold: number;
  result: VerifyResult;
}

export interface GpsSnapshot {
  lat?: number;
  lng?: number;
  accuracyM?: number;
}

export interface GeoPolicyResult {
  status: GeoPolicyStatus;
  officeId?: string;
  distanceM?: number;
}

export interface DedupeInfo {
  status: "VALID" | "DUPLICATE";
  groupKey: string;
}

export interface AttachmentMeta {
  content_type: string;
  data: string;
}

export interface AttendanceAttachments {
  "evidence.jpg"?: AttachmentMeta;
  [attachmentName: string]: AttachmentMeta | undefined;
}

export interface AttendanceLog extends DocMeta {
  type: "ATTENDANCE_LOG";
  eventId: UUID;
  orgId: string;
  staffId: string;
  action: AttendanceAction;
  deviceId: string;
  clientTs: ISODateTimeString;
  serverTs: ISODateTimeString | null;
  verify: VerifySnapshot;
  gps?: GpsSnapshot;
  geoPolicyResult: GeoPolicyResult;
  syncState: SyncState;
  dedupe: DedupeInfo;
  _attachments?: AttendanceAttachments;
}

export interface Office extends DocMeta {
  type: "OFFICE";
  orgId: string;
  officeId: string;
  name: string;
  center: {
    lat: number;
    lng: number;
  };
  radiusM: number;
}

export interface AuditLog extends DocMeta {
  type: "AUDIT_LOG";
  orgId: string;
  actorId: string;
  action: string;
  targetId?: string;
  at: ISODateTimeString;
  details?: Record<string, unknown>;
}

export interface SystemAdminAccount extends DocMeta {
  type: "SYSTEM_ADMIN";
  orgId: string;
  adminId: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN";
  pinHash: string;
  createdAt: ISODateTimeString;
  lastLoginAt?: ISODateTimeString;
}
