import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceBox, FacePoint } from "../../services/face";
import { useAutoCaptureLoop } from "./useAutoCaptureLoop";
import { useFaceModelBootstrap } from "./useFaceModelBootstrap";
import { ENROLL_AUTO_CAPTURE_INTERVAL_MS, ENROLL_BLUR_STREAK_ALERT_COUNT, ENROLL_CAPTURE_TARGET, ENROLL_MIN_DETECTION_SCORE, ENROLL_MIN_DESCRIPTOR_DIFF_PERCENT, ENROLL_SAME_PERSON_MAX_DISTANCE, ENROLL_SAME_PERSON_MAX_DISTANCE_PERCENT, type CaptureDiagnostics, type CaptureFlowState, buildCaptureDiagnostics, captureEnrollmentPhoto, createDefaultCaptureDiagnostics, descriptorDifferencePercent, estimateFrameBrightness, euclideanDistance, resolveBlurThreshold } from "../services/enrollment-capture";
import { readEnrollmentDraft, saveEnrollmentDraft } from "../services/enrollment-draft";
import { calculateFaceSharpness } from "../utils/sharpness";
import { evaluateFaceVisibility } from "../utils/face-visibility";
interface UseEnrollmentCaptureFlowInput {
  consentAcceptedAt: string | null;
  initialDescriptors: number[][];
  initialPhotos: string[];
  onBack: () => void;
  onReset: () => void;
  onCompleted: (payload: { descriptors: number[][]; photos: string[] }) => void;
}
interface UseEnrollmentCaptureFlowResult {
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
  handleContinue: () => void;
}
export function useEnrollmentCaptureFlow({
  consentAcceptedAt,
  initialDescriptors,
  initialPhotos,
  onBack,
  onReset,
  onCompleted,
}: UseEnrollmentCaptureFlowInput): UseEnrollmentCaptureFlowResult {
  const [bootDraft] = useState(() => readEnrollmentDraft());
  const effectiveConsentAcceptedAt = consentAcceptedAt ?? bootDraft.consentAcceptedAt;
  const { modelPercent, modelReady, modelLoading, modelError } = useFaceModelBootstrap();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [descriptors, setDescriptors] = useState<number[][]>(() =>
    initialDescriptors.length > 0 ? initialDescriptors : bootDraft.descriptors
  );
  const [photos, setPhotos] = useState<string[]>(() =>
    initialPhotos.length > 0 ? initialPhotos : bootDraft.photos
  );
  const [captureBusy, setCaptureBusy] = useState(false);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [captureState, setCaptureState] = useState<CaptureFlowState>("SCANNING");
  const [captureHint, setCaptureHint] = useState("Auto capture is running. Keep changing head angle.");
  const [blurStatus, setBlurStatus] = useState<"NORMAL" | "BLURRY">("NORMAL");
  const [blurFrameStreak, setBlurFrameStreak] = useState(0);
  const [lastSharpnessScore, setLastSharpnessScore] = useState<number | null>(null);
  const [lastMinDiffPercent, setLastMinDiffPercent] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<CaptureDiagnostics>(() => createDefaultCaptureDiagnostics());
  const [faceGuideBox, setFaceGuideBox] = useState<FaceBox | null>(null);
  const [faceGuideLandmarks, setFaceGuideLandmarks] = useState<FacePoint[]>([]);
  const lastBlurVibrationAtRef = useRef(0);
  const sharpnessWindowRef = useRef<number[]>([]);
  const persistDraft = useCallback(
    (nextDescriptors: number[][], nextPhotos: string[]) => {
      if (!effectiveConsentAcceptedAt) {
        return;
      }
      saveEnrollmentDraft({
        consentAcceptedAt: effectiveConsentAcceptedAt,
        descriptors: nextDescriptors,
        photos: nextPhotos,
      });
    },
    [effectiveConsentAcceptedAt]
  );
  useEffect(() => {
    if (!effectiveConsentAcceptedAt) {
      onBack();
    }
  }, [effectiveConsentAcceptedAt, onBack]);
  const handleCapture = useCallback(async () => {
    if (!videoElement || !cameraReady || !modelReady || captureBusy) {
      return;
    }
    if (descriptors.length >= ENROLL_CAPTURE_TARGET) {
      return;
    }
    setCaptureBusy(true);
    setCaptureState("SCANNING");
    try {
      const { faceAPIService } = await import("../../services/face");
      const brightnessScore = estimateFrameBrightness(videoElement);
      const detection = await faceAPIService.detectFace(videoElement);
      if (!detection) {
        setFaceGuideBox(null);
        setFaceGuideLandmarks([]);
        sharpnessWindowRef.current = [];
        setDiagnostics(buildCaptureDiagnostics({ brightnessScore, faceConfidence: null }));
        throw new Error("No face detected. Keep face centered and retry.");
      }
      setFaceGuideBox(detection.box);
      setFaceGuideLandmarks(detection.landmarks);
      const frameDiagnostics = buildCaptureDiagnostics({ brightnessScore, faceConfidence: detection.score });
      setDiagnostics(frameDiagnostics);
      if (detection.score < ENROLL_MIN_DETECTION_SCORE) {
        setCaptureState("LOW_CONFIDENCE");
        throw new Error("Face confidence is low. Increase lighting and keep still.");
      }
      const visibility = evaluateFaceVisibility(detection.box, detection.landmarks, videoElement, detection.score);
      if (visibility.blocked) {
        setCaptureState("LOW_CONFIDENCE");
        setCaptureHint("请勿遮挡眼睛/鼻子/嘴巴，保持完整五官可见。");
        if (import.meta.env.DEV) {
          console.debug("[Enroll][Visibility]", visibility.reason);
        }
        return;
      }
      const blurThreshold = resolveBlurThreshold(frameDiagnostics.lightLevel);
      const sharpnessScore = calculateFaceSharpness(videoElement, detection.box);
      if (sharpnessScore !== null) {
        const window = [...sharpnessWindowRef.current, sharpnessScore];
        sharpnessWindowRef.current = window.slice(-3);
      }
      const scoreWindow = sharpnessWindowRef.current;
      const averageSharpness =
        scoreWindow.length > 0
          ? scoreWindow.reduce((sum, value) => sum + value, 0) / scoreWindow.length
          : sharpnessScore;
      setLastSharpnessScore(averageSharpness);
      if (import.meta.env.DEV) {
        console.debug("[Enroll][Blur]", {
          sharpnessScore,
          averageSharpness,
          blurThreshold,
          lightLevel: frameDiagnostics.lightLevel,
        });
      }
      if (averageSharpness !== null && averageSharpness < blurThreshold) {
        setBlurStatus("BLURRY");
        setBlurFrameStreak((previous) => {
          const next = previous + 1;
          if (next >= ENROLL_BLUR_STREAK_ALERT_COUNT) {
            const now = Date.now();
            if (now - lastBlurVibrationAtRef.current >= 1400) {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate(45);
              }
              lastBlurVibrationAtRef.current = now;
            }
          }
          return next;
        });
        setCaptureState("BLURRY");
        setCaptureHint("画面模糊，请保持手机稳定并稍微停顿。");
        return;
      }
      setBlurStatus("NORMAL");
      setBlurFrameStreak(0);
      const descriptor = Array.from(detection.descriptor);
      if (descriptors.length > 0) {
        // Anchor check: all enrollment samples must stay within same-person distance from the first accepted sample.
        const anchorDistance = euclideanDistance(descriptors[0], descriptor);
        if (anchorDistance > ENROLL_SAME_PERSON_MAX_DISTANCE) {
          setCaptureState("LOW_CONFIDENCE");
          setCaptureHint(
            `疑似非同一人（anchor diff ${descriptorDifferencePercent(anchorDistance).toFixed(2)}% > ${ENROLL_SAME_PERSON_MAX_DISTANCE_PERCENT.toFixed(0)}%）。请由同一人继续采集。`
          );
          return;
        }
        const minDistance = Math.min(
          ...descriptors.map((savedDescriptor) => euclideanDistance(savedDescriptor, descriptor))
        );
        const minDiffPercent = descriptorDifferencePercent(minDistance);
        setLastMinDiffPercent(minDiffPercent);
        if (minDiffPercent < ENROLL_MIN_DESCRIPTOR_DIFF_PERCENT) {
          setCaptureState("TOO_SIMILAR");
          setCaptureHint(
            `Too similar (${minDiffPercent.toFixed(2)}%). Need >= ${ENROLL_MIN_DESCRIPTOR_DIFF_PERCENT}%. Change angle and retry.`
          );
          return;
        }
      }
      const photoBase64 = captureEnrollmentPhoto(videoElement);
      const nextDescriptors = [...descriptors, descriptor];
      const nextPhotos = [...photos, photoBase64];
      setDescriptors(nextDescriptors);
      setPhotos(nextPhotos);
      persistDraft(nextDescriptors, nextPhotos);
      if (nextDescriptors.length >= ENROLL_CAPTURE_TARGET) {
        setCaptureState("COMPLETED");
        setCaptureHint("Capture complete. Continue to liveness challenge.");
      } else {
        setCaptureState("CAPTURED");
        setCaptureHint("Captured. Switch pose and continue.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Descriptor capture failed.";
      setCaptureHint((previous) => (previous === message ? previous : message));
      if (captureState !== "BLURRY") {
        setCaptureState("LOW_CONFIDENCE");
      }
    } finally {
      setCaptureBusy(false);
    }
  }, [cameraReady, captureBusy, captureState, descriptors, modelReady, persistDraft, photos, videoElement]);
  useAutoCaptureLoop({
    enabled: autoCaptureEnabled && descriptors.length < ENROLL_CAPTURE_TARGET,
    ready: Boolean(videoElement && cameraReady && modelReady),
    intervalMs: ENROLL_AUTO_CAPTURE_INTERVAL_MS,
    onTick: handleCapture,
  });
  const handleCameraReady = useCallback((video: HTMLVideoElement) => {
    setCameraReady(true);
    setCameraError(null);
    setVideoElement(video);
  }, []);
  const handleCameraError = useCallback((error: Error) => {
    setCameraReady(false);
    setCameraError(error.message);
  }, []);
  const handleToggleAutoCapture = useCallback(() => {
    setAutoCaptureEnabled((current) => !current);
  }, []);
  const handleReset = useCallback(() => {
    setDescriptors([]);
    setPhotos([]);
    onReset();
    persistDraft([], []);
    setAutoCaptureEnabled(true);
    setCaptureState("SCANNING");
    setCaptureHint("Capture reset. Auto capture resumed.");
    setBlurStatus("NORMAL");
    setBlurFrameStreak(0);
    setLastSharpnessScore(null);
    sharpnessWindowRef.current = [];
    lastBlurVibrationAtRef.current = 0;
    setLastMinDiffPercent(null);
    setDiagnostics(createDefaultCaptureDiagnostics());
    setFaceGuideBox(null);
    setFaceGuideLandmarks([]);
  }, [onReset, persistDraft]);
  const handleContinue = useCallback(() => {
    persistDraft(descriptors, photos);
    onCompleted({ descriptors, photos });
  }, [descriptors, onCompleted, persistDraft, photos]);
  const capturePercent = Math.round((descriptors.length / ENROLL_CAPTURE_TARGET) * 100);
  return {
    hasConsent: Boolean(effectiveConsentAcceptedAt),
    modelPercent,
    modelReady,
    modelLoading,
    modelError,
    cameraReady,
    cameraError,
    videoElement,
    descriptors,
    photos,
    captureBusy,
    autoCaptureEnabled,
    captureState,
    captureHint,
    blurStatus,
    blurFrameStreak,
    lastSharpnessScore,
    lastMinDiffPercent,
    diagnostics,
    faceGuideBox,
    faceGuideLandmarks,
    capturePercent,
    captureTarget: ENROLL_CAPTURE_TARGET,
    minDescriptorDiffPercent: ENROLL_MIN_DESCRIPTOR_DIFF_PERCENT,
    autoCaptureIntervalMs: ENROLL_AUTO_CAPTURE_INTERVAL_MS,
    handleCameraReady,
    handleCameraError,
    handleToggleAutoCapture,
    handleReset,
    handleContinue,
  };
}
