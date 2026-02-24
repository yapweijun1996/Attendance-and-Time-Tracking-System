import type { EnrollStatus as DomainEnrollStatus } from "../types/domain";

export type AttendanceAction = "IN" | "OUT";

export type SyncState = "LOCAL_ONLY" | "SYNCING" | "SYNCED" | "FAILED";

export type GeoStatus = "IN_RANGE" | "OUT_OF_RANGE" | "LOCATION_UNAVAILABLE";

export type EnrollStatus = DomainEnrollStatus;

export interface RecentEvent {
  id: string;
  staffId: string;
  action: AttendanceAction;
  clientTs: string;
  geoStatus: GeoStatus;
  syncState: SyncState;
}

export interface VerificationResult {
  success: boolean;
  action: AttendanceAction;
  clientTs: string;
  geoStatus: GeoStatus;
  syncState: SyncState;
  reasonCode: VerificationReasonCode;
  message: string;
}

export type VerificationReasonCode =
  | "SUCCESS_RECORDED"
  | "DUPLICATE_IGNORED"
  | "COOLDOWN_ACTIVE"
  | "NO_FACE_DETECTED"
  | "MODEL_LOAD_FAILED"
  | "CAMERA_UNAVAILABLE"
  | "EVIDENCE_CAPTURE_FAILED"
  | "PERSIST_FAILED"
  | "VERIFICATION_FAILED";
