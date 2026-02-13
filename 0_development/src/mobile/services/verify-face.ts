import type { DetectFaceResult } from "../../services/face";
import type { AttendanceAction, VerificationResult } from "../types";
import { loadCurrentUserProfile } from "./enrollment";
import { loadVerificationThreshold } from "./policy";

interface VerifyFaceGateFailure {
  ok: false;
  result: VerificationResult;
}

interface VerifyFaceGateSuccess {
  ok: true;
  detection: DetectFaceResult;
  staffId: string;
}

export type VerifyFaceGateResult = VerifyFaceGateFailure | VerifyFaceGateSuccess;

function buildFailure(action: AttendanceAction, message: string): VerificationResult {
  return {
    success: false,
    action,
    clientTs: new Date().toISOString(),
    geoStatus: "LOCATION_UNAVAILABLE",
    syncState: "FAILED",
    reasonCode: "VERIFICATION_FAILED",
    message,
  };
}

export async function verifyAgainstActiveEnrollment(
  action: AttendanceAction,
  videoElement: HTMLVideoElement
): Promise<VerifyFaceGateResult> {
  const { faceAPIService } = await import("../../services/face");
  const threshold = await loadVerificationThreshold();

  const profile = await loadCurrentUserProfile();
  if (!profile || profile.enrollStatus !== "ACTIVE" || profile.faceDescriptors.length === 0) {
    return {
      ok: false,
      result: buildFailure(
        action,
        "No active enrollment profile. Please complete face registration first."
      ),
    };
  }

  // Always bind matcher to the latest profile descriptors before verification.
  faceAPIService.setProfiles([
    {
      id: profile.staffId,
      name: profile.name,
      descriptors: profile.faceDescriptors,
    },
  ]);

  const detection = await faceAPIService.detectFace(videoElement);
  if (!detection) {
    return {
      ok: false,
      result: {
        success: false,
        action,
        clientTs: new Date().toISOString(),
        geoStatus: "LOCATION_UNAVAILABLE",
        syncState: "FAILED",
        reasonCode: "NO_FACE_DETECTED",
        message: "No face detected. Please align face and retry.",
      },
    };
  }

  const match = faceAPIService.matchFace(detection.descriptor, threshold);
  if (!match.matched) {
    return {
      ok: false,
      result: buildFailure(
        action,
        `Face mismatch. Distance ${match.distance.toFixed(3)} exceeds threshold ${match.threshold.toFixed(3)}.`
      ),
    };
  }

  return {
    ok: true,
    detection,
    staffId: profile.staffId,
  };
}
