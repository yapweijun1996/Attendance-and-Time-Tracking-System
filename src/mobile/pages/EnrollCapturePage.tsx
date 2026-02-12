import { useCallback, useEffect, useMemo, useState } from "react";

import LiveCamera from "../../components/Camera/LiveCamera";
import type { FaceModelLoadProgress } from "../../services/face";

const CAPTURE_TARGET = 20;
const MIN_DETECTION_SCORE = 0.55;
const MIN_DESCRIPTOR_DIFF_PERCENT = 15;

const captureHints = ["Face Forward", "Turn Left", "Turn Right", "Look Up", "Look Down"];

interface EnrollCapturePageProps {
  consentAcceptedAt: string | null;
  initialDescriptors: number[][];
  initialPhotos: string[];
  onBack: () => void;
  onReset: () => void;
  onCompleted: (payload: { descriptors: number[][]; photos: string[] }) => void;
}

function euclideanDistance(left: number[], right: number[]): number {
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

function descriptorDifferencePercent(distance: number): number {
  const percent = distance * 100;
  return Math.max(0, Math.min(100, percent));
}

function captureEnrollmentPhoto(videoElement: HTMLVideoElement): string {
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

export default function EnrollCapturePage({
  consentAcceptedAt,
  initialDescriptors,
  initialPhotos,
  onBack,
  onReset,
  onCompleted,
}: EnrollCapturePageProps) {
  const [modelPercent, setModelPercent] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [descriptors, setDescriptors] = useState<number[][]>(initialDescriptors);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureHint, setCaptureHint] = useState("Capture with prompt changes to improve descriptor diversity.");
  const [lastMinDiffPercent, setLastMinDiffPercent] = useState<number | null>(null);

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

  const currentHint = useMemo(
    () => captureHints[descriptors.length % captureHints.length],
    [descriptors.length]
  );

  const handleCapture = useCallback(async () => {
    if (!videoElement || !cameraReady || !modelReady || captureBusy) {
      return;
    }
    if (descriptors.length >= CAPTURE_TARGET) {
      return;
    }

    setCaptureBusy(true);
    try {
      const { faceAPIService } = await import("../../services/face");
      const detection = await faceAPIService.detectFace(videoElement);
      if (!detection) {
        throw new Error("No face detected. Keep face centered and retry.");
      }
      if (detection.score < MIN_DETECTION_SCORE) {
        throw new Error("Face confidence is low. Increase lighting and keep still.");
      }

      const descriptor = Array.from(detection.descriptor);
      const photoBase64 = captureEnrollmentPhoto(videoElement);

      // Prevent near-duplicate captures so enrollment contains meaningful angle changes.
      if (descriptors.length > 0) {
        const minDistance = Math.min(
          ...descriptors.map((savedDescriptor) => euclideanDistance(savedDescriptor, descriptor))
        );
        const minDiffPercent = descriptorDifferencePercent(minDistance);
        setLastMinDiffPercent(minDiffPercent);
        if (minDiffPercent < MIN_DESCRIPTOR_DIFF_PERCENT) {
          setCaptureHint(
            `Too similar (${minDiffPercent.toFixed(2)}%). Need >= ${MIN_DESCRIPTOR_DIFF_PERCENT}%. Change angle and retry.`
          );
          return;
        }
      }

      const nextDescriptors = [...descriptors, descriptor];
      const nextPhotos = [...photos, photoBase64];
      setDescriptors(nextDescriptors);
      setPhotos(nextPhotos);
      if (nextDescriptors.length >= CAPTURE_TARGET) {
        setCaptureHint("Capture complete. Continue to liveness challenge.");
      } else {
        setCaptureHint("Captured. Switch pose and continue.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Descriptor capture failed.";
      setCaptureHint(message);
    } finally {
      setCaptureBusy(false);
    }
  }, [cameraReady, captureBusy, descriptors, modelReady, photos, videoElement]);

  if (!consentAcceptedAt) {
    return (
      <div className="ui-page-flow">
        <main className="ui-main-flow">
          <h1 className="ui-title text-xl">Enrollment Capture</h1>
          <p className="ui-note-warn mt-2">
            Consent is required before capture. Return to consent step first.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="ui-btn ui-btn-primary mt-4 w-full"
          >
            Back To Consent
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="ui-page-flow">
      <main className="ui-main-flow">
        <button type="button" onClick={onBack} className="ui-back-btn">
          Back
        </button>

        <h1 className="ui-title text-xl">Enrollment Capture</h1>
        <p className="ui-note mt-1">Collect {CAPTURE_TARGET} descriptors with angle prompts.</p>

        <section className="ui-card mt-4 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span className="ui-note-xs">Progress</span>
            <span className="ui-title text-xs">
              {descriptors.length}/{CAPTURE_TARGET}
            </span>
          </div>
          <div className="ui-progress-track">
            <div
              className="ui-progress-bar"
              style={{ width: `${Math.round((descriptors.length / CAPTURE_TARGET) * 100)}%` }}
            />
          </div>
          <p className="ui-kicker mt-3">
            Current Prompt: {currentHint}
          </p>
          <p className="ui-note-xs mt-1">{captureHint}</p>
        </section>

        <section className="ui-card mt-4 p-4">
          <div className="mb-3 flex items-center justify-between text-xs font-medium">
            <span className="ui-note-xs">Model</span>
            <span className={modelReady ? "ui-status-ok" : "ui-status-pending"}>
              {modelReady ? "Ready" : modelLoading ? `${modelPercent}%` : "Pending"}
            </span>
          </div>
          {modelError ? <p className="ui-note-error mb-2">{modelError}</p> : null}

          <LiveCamera
            facingMode="user"
            onReady={(video) => {
              setCameraReady(true);
              setCameraError(null);
              setVideoElement(video);
            }}
            onError={(error) => {
              setCameraReady(false);
              setCameraError(error.message);
            }}
          />
          {cameraError ? <p className="ui-note-error mt-2">{cameraError}</p> : null}

          <button
            type="button"
            onClick={() => {
              void handleCapture();
            }}
            disabled={!modelReady || !cameraReady || captureBusy || descriptors.length >= CAPTURE_TARGET}
            className="ui-btn ui-btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {captureBusy ? "Capturing..." : "Capture Descriptor"}
          </button>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setDescriptors([]);
              setPhotos([]);
              onReset();
              setCaptureHint("Capture reset. Start again from face forward.");
              setLastMinDiffPercent(null);
            }}
            className="ui-btn ui-btn-ghost min-h-0"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onCompleted({ descriptors, photos })}
            disabled={descriptors.length < CAPTURE_TARGET}
            className="ui-btn ui-btn-success min-h-0 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Continue
          </button>
        </div>
        <p className="ui-note-xs mt-2">
          Min required difference per capture: {MIN_DESCRIPTOR_DIFF_PERCENT}%.
          {lastMinDiffPercent !== null ? ` Last min difference: ${lastMinDiffPercent.toFixed(2)}%.` : ""}
        </p>
      </main>
    </div>
  );
}
