import { useCallback, useEffect, useMemo, useState } from "react";

import type { FaceModelLoadProgress } from "../../services/face";
import type { FaceBox, FacePoint } from "../../services/face";
import { useAutoCaptureLoop } from "./useAutoCaptureLoop";
import {
  ENROLL_AUTO_CAPTURE_INTERVAL_MS,
  ENROLL_CAPTURE_HINTS,
  ENROLL_CAPTURE_TARGET,
  ENROLL_MIN_DETECTION_SCORE,
  ENROLL_MIN_DESCRIPTOR_DIFF_PERCENT,
  type CaptureDiagnostics,
  type CaptureFlowState,
  buildCaptureDiagnostics,
  captureEnrollmentPhoto,
  createDefaultCaptureDiagnostics,
  descriptorDifferencePercent,
  estimateFrameBrightness,
  euclideanDistance,
} from "../services/enrollment-capture";
import { readEnrollmentDraft, saveEnrollmentDraft } from "../services/enrollment-draft";

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
  lastMinDiffPercent: number | null;
  diagnostics: CaptureDiagnostics;
  faceGuideBox: FaceBox | null;
  faceGuideLandmarks: FacePoint[];
  currentHint: string;
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
  const [modelPercent, setModelPercent] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
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
  const [lastMinDiffPercent, setLastMinDiffPercent] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<CaptureDiagnostics>(() => createDefaultCaptureDiagnostics());
  const [faceGuideBox, setFaceGuideBox] = useState<FaceBox | null>(null);
  const [faceGuideLandmarks, setFaceGuideLandmarks] = useState<FacePoint[]>([]);

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
    let cancelled = false;

    const loadModels = async () => {
      setModelLoading(true);
      setModelError(null);
      try {
        const { faceAPIService } = await import("../../services/face");
        await faceAPIService.loadModels("/models", (progress: FaceModelLoadProgress) => {
          if (!cancelled) {
            setModelPercent(progress.percent);
          }
        });
        if (!cancelled) {
          setModelReady(true);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to load face model.";
        setModelError(message);
      } finally {
        if (!cancelled) {
          setModelLoading(false);
        }
      }
    };

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

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
        setDiagnostics(buildCaptureDiagnostics({ brightnessScore, faceConfidence: null }));
        throw new Error("No face detected. Keep face centered and retry.");
      }

      setFaceGuideBox(detection.box);
      setFaceGuideLandmarks(detection.landmarks);
      setDiagnostics(buildCaptureDiagnostics({ brightnessScore, faceConfidence: detection.score }));
      if (detection.score < ENROLL_MIN_DETECTION_SCORE) {
        setCaptureState("LOW_CONFIDENCE");
        throw new Error("Face confidence is low. Increase lighting and keep still.");
      }

      const descriptor = Array.from(detection.descriptor);
      if (descriptors.length > 0) {
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
      setCaptureState("LOW_CONFIDENCE");
      const message = error instanceof Error ? error.message : "Descriptor capture failed.";
      setCaptureHint((previous) => (previous === message ? previous : message));
    } finally {
      setCaptureBusy(false);
    }
  }, [cameraReady, captureBusy, descriptors, modelReady, persistDraft, photos, videoElement]);

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
    setLastMinDiffPercent(null);
    setDiagnostics(createDefaultCaptureDiagnostics());
    setFaceGuideBox(null);
    setFaceGuideLandmarks([]);
  }, [onReset, persistDraft]);

  const handleContinue = useCallback(() => {
    persistDraft(descriptors, photos);
    onCompleted({ descriptors, photos });
  }, [descriptors, onCompleted, persistDraft, photos]);

  const currentHint = useMemo(
    () => ENROLL_CAPTURE_HINTS[descriptors.length % ENROLL_CAPTURE_HINTS.length],
    [descriptors.length]
  );
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
    lastMinDiffPercent,
    diagnostics,
    faceGuideBox,
    faceGuideLandmarks,
    currentHint,
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
