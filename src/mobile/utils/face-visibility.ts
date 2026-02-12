import type { FaceBox, FacePoint } from "../../services/face";
import { evaluateEyeOcclusion, evaluateLowerFaceOcclusion } from "./visibility-image-checks";

interface FaceVisibilityCheck {
  blocked: boolean;
  reason: string | null;
}

const MIN_EYE_AREA_RATIO = 0.001;
const MIN_NOSE_HEIGHT_RATIO = 0.1;
const MIN_INTER_EYE_RATIO = 0.22;
const MIN_EYE_AREA_SYMMETRY_RATIO = 0.55;
const MIN_EYE_WIDTH_SYMMETRY_RATIO = 0.62;
const MIN_MOUTH_AREA_RATIO = 0.007;
const MIN_MOUTH_WIDTH_RATIO = 0.24;
const MIN_MOUTH_HEIGHT_RATIO = 0.02;
const MIN_NOSE_TO_MOUTH_RATIO = 0.2;
const MIN_MOUTH_CENTER_Y_RATIO = 0.58;
const MIN_EYE_TO_MOUTH_RATIO = 0.22;
const MIN_MOUTH_TO_CHIN_RATIO = 0.09;
const MIN_LANDMARK_CONFIDENCE_PROXY = 0.74;
const STRICT_MOUTH_AREA_RATIO = 0.0085;
const STRICT_NOSE_TO_MOUTH_RATIO = 0.22;

function polygonArea(points: FacePoint[]): number {
  if (points.length < 3) {
    return 0;
  }
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) * 0.5;
}

function averagePoint(points: FacePoint[]): FacePoint {
  const totals = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 }
  );
  return {
    x: totals.x / points.length,
    y: totals.y / points.length,
  };
}

function distance(left: FacePoint, right: FacePoint): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}


export function evaluateFaceVisibility(
  box: FaceBox,
  landmarks: FacePoint[],
  videoElement?: HTMLVideoElement,
  landmarkConfidence = 1
): FaceVisibilityCheck {
  if (landmarks.length < 68) {
    return { blocked: true, reason: "insufficient_landmarks" };
  }

  const faceArea = Math.max(1, box.width * box.height);
  const leftEyeAreaRatio = polygonArea(landmarks.slice(36, 42)) / faceArea;
  const rightEyeAreaRatio = polygonArea(landmarks.slice(42, 48)) / faceArea;
  const leftEyeWidthRatio = distance(landmarks[36], landmarks[39]) / Math.max(1, box.width);
  const rightEyeWidthRatio = distance(landmarks[42], landmarks[45]) / Math.max(1, box.width);
  const mouthAreaRatio = polygonArea(landmarks.slice(48, 60)) / faceArea;
  const mouthWidthRatio = distance(landmarks[48], landmarks[54]) / Math.max(1, box.width);
  const mouthHeightRatio = distance(landmarks[51], landmarks[57]) / Math.max(1, box.height);
  const noseToMouthRatio = distance(landmarks[33], landmarks[57]) / Math.max(1, box.height);
  const noseHeightRatio = distance(landmarks[27], landmarks[33]) / Math.max(1, box.height);
  const leftEyeCenter = averagePoint(landmarks.slice(36, 42));
  const rightEyeCenter = averagePoint(landmarks.slice(42, 48));
  const mouthCenter = averagePoint(landmarks.slice(48, 60));
  const eyeCenter = averagePoint([leftEyeCenter, rightEyeCenter]);
  const chinPoint = landmarks[8];
  const interEyeRatio = distance(leftEyeCenter, rightEyeCenter) / Math.max(1, box.width);
  const mouthCenterYRatio = (mouthCenter.y - box.y) / Math.max(1, box.height);
  const eyeToMouthRatio = distance(eyeCenter, mouthCenter) / Math.max(1, box.height);
  const mouthToChinRatio = distance(mouthCenter, chinPoint) / Math.max(1, box.height);
  // face-api.js currently exposes detection score but not per-landmark score; use it as landmark confidence proxy.
  const lowLandmarkConfidence = landmarkConfidence < MIN_LANDMARK_CONFIDENCE_PROXY;
  const mouthAreaThreshold = lowLandmarkConfidence ? STRICT_MOUTH_AREA_RATIO : MIN_MOUTH_AREA_RATIO;
  const noseToMouthThreshold = lowLandmarkConfidence ? STRICT_NOSE_TO_MOUTH_RATIO : MIN_NOSE_TO_MOUTH_RATIO;
  const mouthLikelyBlocked =
    mouthAreaRatio < mouthAreaThreshold ||
    mouthWidthRatio < MIN_MOUTH_WIDTH_RATIO ||
    mouthHeightRatio < MIN_MOUTH_HEIGHT_RATIO ||
    noseToMouthRatio < noseToMouthThreshold ||
    mouthCenterYRatio < MIN_MOUTH_CENTER_Y_RATIO ||
    eyeToMouthRatio < MIN_EYE_TO_MOUTH_RATIO ||
    mouthToChinRatio < MIN_MOUTH_TO_CHIN_RATIO;
  const eyeAreaSymmetry =
    Math.min(leftEyeAreaRatio, rightEyeAreaRatio) / Math.max(0.0001, Math.max(leftEyeAreaRatio, rightEyeAreaRatio));
  const eyeWidthSymmetry =
    Math.min(leftEyeWidthRatio, rightEyeWidthRatio) /
    Math.max(0.0001, Math.max(leftEyeWidthRatio, rightEyeWidthRatio));

  const failedChecks: string[] = [];
  if (
    leftEyeAreaRatio < MIN_EYE_AREA_RATIO ||
    rightEyeAreaRatio < MIN_EYE_AREA_RATIO ||
    eyeAreaSymmetry < MIN_EYE_AREA_SYMMETRY_RATIO ||
    eyeWidthSymmetry < MIN_EYE_WIDTH_SYMMETRY_RATIO
  ) {
    failedChecks.push("eyes");
  }
  const eyeOcclusionResult = videoElement ? evaluateEyeOcclusion(videoElement, landmarks) : null;
  if (eyeOcclusionResult?.blocked && eyeOcclusionResult.reason) {
    failedChecks.push(eyeOcclusionResult.reason);
  }
  if (mouthLikelyBlocked) {
    failedChecks.push("mouth");
  }
  const lowerFaceOcclusionReason = videoElement ? evaluateLowerFaceOcclusion(videoElement, box) : null;
  if (lowerFaceOcclusionReason) {
    failedChecks.push(lowerFaceOcclusionReason);
  }
  if (noseHeightRatio < MIN_NOSE_HEIGHT_RATIO) {
    failedChecks.push("nose");
  }
  if (interEyeRatio < MIN_INTER_EYE_RATIO) {
    failedChecks.push("alignment");
  }

  // Mouth occlusion should be blocked immediately (e.g. hand covering lower face).
  // Keep multi-check fallback for other non-mouth failures.
  const blocked =
    failedChecks.includes("eyes") ||
    failedChecks.includes("mouth") ||
    failedChecks.some((check) => check.startsWith("eye_occlusion(")) ||
    failedChecks.some((check) => check.startsWith("mask(")) ||
    failedChecks.length >= 2 ||
    (failedChecks.includes("eyes") && failedChecks.includes("nose"));

  return {
    blocked,
    reason: blocked ? failedChecks.join(",") : null,
  };
}
