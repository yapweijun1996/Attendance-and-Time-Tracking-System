import type { VerificationReasonCode, VerificationResult } from "../types";

type ResultTone = "success" | "warning" | "error";

interface ResultAction {
  label: string;
  path: string;
}

export interface ResultPresentation {
  title: string;
  tone: ResultTone;
  guidance: string;
  primaryAction: ResultAction;
  secondaryAction: ResultAction;
}

const retryActionLabel = "Retry Verify";

const codeMap: Record<VerificationReasonCode, Omit<ResultPresentation, "title">> = {
  SUCCESS_RECORDED: {
    tone: "success",
    guidance: "Attendance has been saved locally and will sync automatically.",
    primaryAction: { label: "Go Home", path: "/m/home" },
    secondaryAction: { label: "View History", path: "/m/history" },
  },
  DUPLICATE_IGNORED: {
    tone: "warning",
    guidance: "Same request was already saved. Duplicate action was ignored safely.",
    primaryAction: { label: "Go Home", path: "/m/home" },
    secondaryAction: { label: "View History", path: "/m/history" },
  },
  COOLDOWN_ACTIVE: {
    tone: "warning",
    guidance: "Cooldown is active for this action. Please retry after remaining seconds.",
    primaryAction: { label: retryActionLabel, path: "/m/home" },
    secondaryAction: { label: "Back Home", path: "/m/home" },
  },
  NO_FACE_DETECTED: {
    tone: "error",
    guidance: "Keep your face centered and retry with stable lighting.",
    primaryAction: { label: retryActionLabel, path: "/m/home" },
    secondaryAction: { label: "Back Home", path: "/m/home" },
  },
  MODEL_LOAD_FAILED: {
    tone: "error",
    guidance: "Face model did not load completely. Retry after network is stable.",
    primaryAction: { label: retryActionLabel, path: "/m/home" },
    secondaryAction: { label: "Back Home", path: "/m/home" },
  },
  CAMERA_UNAVAILABLE: {
    tone: "error",
    guidance: "Camera access failed. Check browser permission and retry.",
    primaryAction: { label: retryActionLabel, path: "/m/home" },
    secondaryAction: { label: "Back Home", path: "/m/home" },
  },
  EVIDENCE_CAPTURE_FAILED: {
    tone: "error",
    guidance: "Evidence generation failed. Retry once to regenerate watermark image.",
    primaryAction: { label: retryActionLabel, path: "/m/home" },
    secondaryAction: { label: "Back Home", path: "/m/home" },
  },
  PERSIST_FAILED: {
    tone: "error",
    guidance: "Local save failed. Check storage availability and retry.",
    primaryAction: { label: retryActionLabel, path: "/m/home" },
    secondaryAction: { label: "Back Home", path: "/m/home" },
  },
  VERIFICATION_FAILED: {
    tone: "error",
    guidance: "Verification failed. Retry and ensure camera + permissions are available.",
    primaryAction: { label: retryActionLabel, path: "/m/home" },
    secondaryAction: { label: "Back Home", path: "/m/home" },
  },
};

function withRetryPath(pathTemplate: string, action: "IN" | "OUT"): string {
  if (pathTemplate !== "/m/home") {
    return pathTemplate;
  }
  return `/m/verify?action=${action}`;
}

export function getResultPresentation(result: VerificationResult): ResultPresentation {
  const mapped = codeMap[result.reasonCode];
  const title = result.success ? "Attendance Success" : "Attendance Failed";

  if (
    result.reasonCode === "COOLDOWN_ACTIVE" ||
    result.reasonCode === "NO_FACE_DETECTED" ||
    result.reasonCode === "MODEL_LOAD_FAILED" ||
    result.reasonCode === "CAMERA_UNAVAILABLE" ||
    result.reasonCode === "EVIDENCE_CAPTURE_FAILED" ||
    result.reasonCode === "PERSIST_FAILED" ||
    result.reasonCode === "VERIFICATION_FAILED"
  ) {
    return {
      ...mapped,
      title,
      primaryAction: {
        ...mapped.primaryAction,
        path: withRetryPath(mapped.primaryAction.path, result.action),
      },
    };
  }

  return {
    ...mapped,
    title,
  };
}
