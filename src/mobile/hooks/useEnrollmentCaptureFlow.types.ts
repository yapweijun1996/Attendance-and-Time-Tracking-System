import type { FaceBox, FacePoint } from "../../services/face";
import type { CaptureDiagnostics, CaptureFlowState } from "../services/enrollment-capture";

export interface UseEnrollmentCaptureFlowInput {
  consentAcceptedAt: string | null;
  initialDescriptors: number[][];
  initialPhotos: string[];
  onBack: () => void;
  onReset: () => void;
  onCompleted: (payload: { descriptors: number[][]; photos: string[] }) => void;
}

export interface UseEnrollmentCaptureFlowResult {
  hasConsent: boolean;
  modelPercent: number;
  modelReady: boolean;
  modelLoading: boolean;
  modelError: string | null;
  cameraReady: boolean;
  cameraError: string | null;
  videoElement: HTMLVideoElement | null;
  descriptors: number[][];
  photos: string[];
  captureBusy: boolean;
  autoCaptureEnabled: boolean;
  captureState: CaptureFlowState;
  captureHint: string;
  blurStatus: "NORMAL" | "BLURRY";
  blurFrameStreak: number;
  lastSharpnessScore: number | null;
  lastMinDiffPercent: number | null;
  diagnostics: CaptureDiagnostics;
  faceGuideBox: FaceBox | null;
  faceGuideLandmarks: FacePoint[];
  capturePercent: number;
  captureTarget: number;
  minDescriptorDiffPercent: number;
  autoCaptureIntervalMs: number;
  handleCameraReady: (video: HTMLVideoElement) => void;
  handleCameraError: (error: Error) => void;
  handleToggleAutoCapture: () => void;
  handleReset: () => void;
  handleContinue: () => Promise<void>;
}
