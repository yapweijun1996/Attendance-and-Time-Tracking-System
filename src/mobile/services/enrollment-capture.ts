export const ENROLL_CAPTURE_TARGET = 20;
export const ENROLL_AUTO_CAPTURE_INTERVAL_MS = 600;
export const ENROLL_MIN_DETECTION_SCORE = 0.55;
export const ENROLL_MIN_DESCRIPTOR_DIFF_PERCENT = 15;
export const ENROLL_SAME_PERSON_MAX_DISTANCE = 0.58;
export const ENROLL_SAME_PERSON_MAX_DISTANCE_PERCENT = ENROLL_SAME_PERSON_MAX_DISTANCE * 100;
// Raw Laplacian variance threshold (non-normalized). Calibrated to reduce over-blocking.
export const ENROLL_BLUR_THRESHOLD_BASE = 2200;
export const ENROLL_BLUR_STREAK_ALERT_COUNT = 3;
export const ENROLL_CAPTURE_HINTS = [
  "Face Forward",
  "Turn Left",
  "Turn Right",
  "Look Up",
  "Look Down",
];

export type CaptureFlowState =
  | "SCANNING"
  | "LOW_CONFIDENCE"
  | "BLURRY"
  | "TOO_SIMILAR"
  | "CAPTURED"
  | "COMPLETED";

export type CaptureSignalLevel = "GOOD" | "WARN" | "CRITICAL";

export interface CaptureDiagnostics {
  brightnessScore: number | null;
  lightLevel: CaptureSignalLevel;
  lightMessage: string;
  faceConfidence: number | null;
  distanceLevel: CaptureSignalLevel;
  distanceMessage: string;
}

export interface CaptureFrameSignal {
  brightnessScore: number | null;
  faceConfidence: number | null;
}

export function euclideanDistance(left: number[], right: number[]): number {
  if (left.length !== right.length) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const delta = left[index] - right[index];
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

export function descriptorDifferencePercent(distance: number): number {
  const percent = distance * 100;
  return Math.max(0, Math.min(100, percent));
}

export function estimateFrameBrightness(videoElement: HTMLVideoElement): number | null {
  const sourceWidth = videoElement.videoWidth;
  const sourceHeight = videoElement.videoHeight;
  if (!sourceWidth || !sourceHeight) {
    return null;
  }

  const sampleWidth = 64;
  const sampleHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * sampleWidth));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.drawImage(videoElement, 0, 0, sampleWidth, sampleHeight);
  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let luminanceSum = 0;
  const pixelCount = imageData.length / 4;

  for (let index = 0; index < imageData.length; index += 4) {
    const red = imageData[index];
    const green = imageData[index + 1];
    const blue = imageData[index + 2];
    luminanceSum += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }

  if (pixelCount === 0) {
    return null;
  }
  return luminanceSum / pixelCount;
}

export function buildCaptureDiagnostics(signal: CaptureFrameSignal): CaptureDiagnostics {
  const light = classifyLight(signal.brightnessScore);
  const distance = classifyDistance(signal.faceConfidence);
  return {
    brightnessScore: signal.brightnessScore,
    lightLevel: light.level,
    lightMessage: light.message,
    faceConfidence: signal.faceConfidence,
    distanceLevel: distance.level,
    distanceMessage: distance.message,
  };
}

export function resolveBlurThreshold(lightLevel: CaptureSignalLevel): number {
  if (lightLevel === "CRITICAL") {
    return ENROLL_BLUR_THRESHOLD_BASE * 0.6;
  }
  if (lightLevel === "WARN") {
    return ENROLL_BLUR_THRESHOLD_BASE * 0.8;
  }
  return ENROLL_BLUR_THRESHOLD_BASE;
}

export function createDefaultCaptureDiagnostics(): CaptureDiagnostics {
  return buildCaptureDiagnostics({
    brightnessScore: null,
    faceConfidence: null,
  });
}

function classifyLight(brightnessScore: number | null): {
  level: CaptureSignalLevel;
  message: string;
} {
  if (brightnessScore === null) {
    return {
      level: "WARN",
      message: "Light: unavailable. Keep face in front of stable light source.",
    };
  }
  if (brightnessScore < 45) {
    return {
      level: "CRITICAL",
      message: "Light: too dark. Move to brighter area or face window/light.",
    };
  }
  if (brightnessScore < 70) {
    return {
      level: "WARN",
      message: "Light: low. Add light to reduce failed captures.",
    };
  }
  return {
    level: "GOOD",
    message: "Light: good.",
  };
}

function classifyDistance(faceConfidence: number | null): {
  level: CaptureSignalLevel;
  message: string;
} {
  if (faceConfidence === null) {
    return {
      level: "CRITICAL",
      message: "Distance: face not found. Move closer and center your face.",
    };
  }
  if (faceConfidence < 0.45) {
    return {
      level: "CRITICAL",
      message: "Distance: likely too far. Move closer to camera.",
    };
  }
  if (faceConfidence < 0.62) {
    return {
      level: "WARN",
      message: "Distance: slightly far. Move a bit closer for stable capture.",
    };
  }
  return {
    level: "GOOD",
    message: "Distance: good.",
  };
}

export function captureEnrollmentPhoto(videoElement: HTMLVideoElement): string {
  const sourceWidth = videoElement.videoWidth || 640;
  const sourceHeight = videoElement.videoHeight || 480;
  const maxWidth = 480;
  const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to create image context for enrollment photo.");
  }

  // Keep snapshot lightweight to reduce storage and sync pressure.
  context.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    throw new Error("Failed to encode enrollment photo.");
  }
  return base64;
}
