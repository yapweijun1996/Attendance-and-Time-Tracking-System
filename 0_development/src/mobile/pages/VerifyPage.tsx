import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import LiveCamera from "../../components/Camera/LiveCamera";
import type { FaceModelLoadProgress } from "../../services/face";
import { loadPolicyConfig } from "../../services/policy-config";
import DesktopSidebar from "../components/DesktopSidebar";
import TopStatusBar from "../components/TopStatusBar";
import type { MobileRoute } from "../router";
import {
  checkActionCooldown,
  DEFAULT_COOLDOWN_SEC,
  verifySubmissionLock,
} from "../services/attendance-guard";
import {
  createAttendanceLog,
  saveAttendanceLogIdempotent,
} from "../services/attendance-log";
import { getOrCreateDeviceId } from "../services/device";
import {
  captureEvidenceAttachment,
  defaultEvidencePolicy,
  type EvidencePolicy,
} from "../services/evidence";
import {
  captureGeolocation,
  defaultOfficeGeofencePolicy,
} from "../services/geofence";
import { verifyAgainstActiveEnrollment } from "../services/verify-face";
import type { AttendanceAction, SyncState, VerificationReasonCode, VerificationResult } from "../types";

interface VerifyPageProps {
  currentRoute: MobileRoute;
  action: AttendanceAction;
  staffName: string | null;
  dbReady: boolean;
  online: boolean;
  latestSyncState: SyncState;
  onBack: () => void;
  onNavigate: (route: MobileRoute) => void;
  onCompleted: (result: VerificationResult) => void;
}

interface VerifyRuntimePolicy {
  cooldownSec: number;
  evidencePolicy: EvidencePolicy;
}

function toFailureReasonCode(message: string): VerificationReasonCode {
  const lower = message.toLowerCase();
  if (lower.includes("no face detected")) {
    return "NO_FACE_DETECTED";
  }
  if (lower.includes("model")) {
    return "MODEL_LOAD_FAILED";
  }
  if (lower.includes("camera")) {
    return "CAMERA_UNAVAILABLE";
  }
  if (lower.includes("evidence")) {
    return "EVIDENCE_CAPTURE_FAILED";
  }
  if (lower.includes("database") || lower.includes("indexeddb") || lower.includes("pouch")) {
    return "PERSIST_FAILED";
  }
  return "VERIFICATION_FAILED";
}

function isRetryableFaceGateFailure(result: VerificationResult): boolean {
  if (result.reasonCode === "NO_FACE_DETECTED") {
    return true;
  }
  return result.reasonCode === "VERIFICATION_FAILED" && result.message.toLowerCase().includes("face mismatch");
}

function clampEvidencePolicy(policy: EvidencePolicy): EvidencePolicy {
  return {
    ...policy,
    maxWidth: Number.isInteger(policy.maxWidth) && policy.maxWidth >= 240 ? policy.maxWidth : defaultEvidencePolicy.maxWidth,
    jpegQuality: Number.isFinite(policy.jpegQuality) ? Math.min(0.95, Math.max(0.4, policy.jpegQuality)) : defaultEvidencePolicy.jpegQuality,
    minJpegQuality: Number.isFinite(policy.minJpegQuality)
      ? Math.min(0.95, Math.max(0.4, policy.minJpegQuality))
      : defaultEvidencePolicy.minJpegQuality,
    maxBytes: Number.isInteger(policy.maxBytes) && policy.maxBytes > 0 ? policy.maxBytes : defaultEvidencePolicy.maxBytes,
  };
}

export default function VerifyPage({
  currentRoute,
  action,
  staffName,
  dbReady,
  online,
  latestSyncState,
  onBack,
  onNavigate,
  onCompleted,
}: VerifyPageProps) {
  const [modelPercent, setModelPercent] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Preparing camera and model...");
  const [cooldownHint, setCooldownHint] = useState<string | null>(null);
  const [faceState, setFaceState] = useState<"SCANNING" | "MISMATCH" | "MATCHED">("SCANNING");
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [runtimePolicy, setRuntimePolicy] = useState<VerifyRuntimePolicy>({
    cooldownSec: DEFAULT_COOLDOWN_SEC,
    evidencePolicy: defaultEvidencePolicy,
  });
  const completionRef = useRef(false);
  const attemptInFlightRef = useRef(false);

  const completeOnce = useCallback(
    (result: VerificationResult) => {
      if (completionRef.current) {
        return;
      }
      completionRef.current = true;
      onCompleted(result);
    },
    [onCompleted]
  );

  useEffect(() => {
    let cancelled = false;

    const loadRuntimePolicy = async () => {
      try {
        const config = await loadPolicyConfig();
        if (cancelled) {
          return;
        }
        const cooldownSec =
          Number.isInteger(config.cooldown.cooldownSec) && config.cooldown.cooldownSec > 0
            ? config.cooldown.cooldownSec
            : DEFAULT_COOLDOWN_SEC;
        const evidencePolicy = clampEvidencePolicy({
          ...defaultEvidencePolicy,
          maxWidth: config.evidence.maxWidth,
          jpegQuality: config.evidence.jpegQuality,
        });
        setRuntimePolicy({
          cooldownSec,
          evidencePolicy,
        });
      } catch {
        // Use defaults when policy doc is unavailable.
      }
    };

    void loadRuntimePolicy();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      setModelLoading(true);
      setModelError(null);
      try {
        const { faceAPIService } = await import("../../services/face");
        await faceAPIService.loadModels(undefined, (progress: FaceModelLoadProgress) => {
          if (cancelled) {
            return;
          }
          setModelPercent(progress.percent);
        });
        if (cancelled) {
          return;
        }
        setModelReady(true);
        setStatusMessage("Face model ready. Auto scanning started.");
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Failed to load face model.";
        setModelError(message);
        setStatusMessage("Model load failed. Please retry.");
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
    if (!showMatchAnimation) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setShowMatchAnimation(false);
    }, 900);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showMatchAnimation]);

  const attemptVerify = useCallback(async () => {
    if (!videoElement || !cameraReady || !modelReady || modelLoading || completionRef.current) {
      return;
    }
    if (attemptInFlightRef.current) {
      return;
    }
    attemptInFlightRef.current = true;
    if (!verifySubmissionLock.acquire(action)) {
      attemptInFlightRef.current = false;
      return;
    }

    setIsVerifying(true);
    setCooldownHint(null);
    setStatusMessage("Auto scanning...");

    try {
      const verifyGate = await verifyAgainstActiveEnrollment(action, videoElement);
      if (!verifyGate.ok) {
        if (isRetryableFaceGateFailure(verifyGate.result)) {
          if (verifyGate.result.reasonCode === "NO_FACE_DETECTED") {
            setFaceState("SCANNING");
            setStatusMessage("Auto scanning... Keep your face centered.");
          } else {
            setFaceState("MISMATCH");
            setStatusMessage("Face not matched. Auto scanning continues.");
          }
          return;
        }
        completeOnce(verifyGate.result);
        return;
      }

      setFaceState("MATCHED");
      setShowMatchAnimation(true);
      setStatusMessage("Face matched. Saving attendance...");
      await new Promise((resolve) => {
        window.setTimeout(resolve, 520);
      });

      const cooldown = await checkActionCooldown(action, runtimePolicy.cooldownSec, verifyGate.staffId);
      if (!cooldown.allowed) {
        setCooldownHint(`Cooldown active. Retry in ${cooldown.remainingSec}s (${action}).`);
        completeOnce({
          success: false,
          action,
          clientTs: new Date().toISOString(),
          geoStatus: cooldown.lastEvent?.geoStatus ?? "LOCATION_UNAVAILABLE",
          syncState: "FAILED",
          reasonCode: "COOLDOWN_ACTIVE",
          message: `Cooldown active. Please wait ${cooldown.remainingSec}s.`,
        });
        return;
      }

      setStatusMessage("Capturing geolocation...");
      const geolocation = await captureGeolocation();
      const eventId = crypto.randomUUID();
      const clientTs = new Date().toISOString();
      const syncState: SyncState = "LOCAL_ONLY";
      const deviceId = getOrCreateDeviceId();

      setStatusMessage("Generating evidence watermark...");
      const evidence = await captureEvidenceAttachment(
        videoElement,
        {
          clientTs,
          lat: geolocation.lat,
          lng: geolocation.lng,
          accuracyM: geolocation.accuracyM,
          officeName: "HQ",
          deviceId,
        },
        runtimePolicy.evidencePolicy
      );

      const attendanceLog = createAttendanceLog({
        eventId,
        staffId: verifyGate.staffId,
        action,
        clientTs,
        syncState,
        verifyScore: verifyGate.detection.score,
        deviceId,
        geoStatus: geolocation.status,
        distanceM: geolocation.distanceM,
        lat: geolocation.lat,
        lng: geolocation.lng,
        accuracyM: geolocation.accuracyM,
        evidenceAttachment: evidence.attachment,
      });
      const saveResult = await saveAttendanceLogIdempotent(attendanceLog);
      if (saveResult.status === "DUPLICATE") {
        completeOnce({
          success: true,
          action,
          clientTs,
          geoStatus: geolocation.status,
          syncState,
          reasonCode: "DUPLICATE_IGNORED",
          message: `${action === "IN" ? "Time In" : "Time Out"} duplicate request ignored.`,
        });
        return;
      }

      completeOnce({
        success: true,
        action,
        clientTs,
        geoStatus: geolocation.status,
        syncState,
        reasonCode: "SUCCESS_RECORDED",
        message: `${action === "IN" ? "Time In" : "Time Out"} recorded locally with evidence (${Math.round(evidence.bytes / 1024)}KB).`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed.";
      completeOnce({
        success: false,
        action,
        clientTs: new Date().toISOString(),
        geoStatus: "LOCATION_UNAVAILABLE",
        syncState: "FAILED",
        reasonCode: toFailureReasonCode(message),
        message,
      });
    } finally {
      setIsVerifying(false);
      attemptInFlightRef.current = false;
      verifySubmissionLock.release(action);
    }
  }, [action, cameraReady, completeOnce, modelLoading, modelReady, runtimePolicy, videoElement]);

  useEffect(() => {
    if (!cameraReady || !modelReady || modelLoading || completionRef.current) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const tick = async () => {
      if (cancelled || completionRef.current) {
        return;
      }
      await attemptVerify();
      if (cancelled || completionRef.current) {
        return;
      }
      timeoutId = window.setTimeout(() => {
        void tick();
      }, 950);
    };

    timeoutId = window.setTimeout(() => {
      void tick();
    }, 320);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [attemptVerify, cameraReady, modelLoading, modelReady]);

  const verifyDisabled = useMemo(
    () => !cameraReady || !modelReady || isVerifying || modelLoading,
    [cameraReady, isVerifying, modelLoading, modelReady]
  );

  const faceStateClass =
    faceState === "MATCHED"
      ? "border-emerald-300 bg-emerald-100 text-emerald-700"
      : faceState === "MISMATCH"
        ? "border-amber-300 bg-amber-100 text-amber-700"
        : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <div className="min-h-screen bg-slate-50/30 font-sans">
      <DesktopSidebar currentRoute={currentRoute} staffName={staffName} onNavigate={onNavigate} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-8 lg:pb-8 lg:pl-72">
        <header className="mb-6 flex items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="ui-back-btn">
            Back
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black tracking-wide text-slate-500">
            AUTO VERIFY
          </div>
        </header>

        <section className="mb-6">
          <TopStatusBar dbReady={dbReady} online={online} syncState={latestSyncState} />
        </section>

        <section className="ui-card p-4">
          <h1 className="ui-title text-xl">Verify {action === "IN" ? "Time In" : "Time Out"}</h1>
          <p className="ui-note mt-1">{statusMessage}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${faceStateClass}`}>
              {faceState === "MATCHED" ? "Matched" : faceState === "MISMATCH" ? "Not matched" : "Scanning"}
            </div>
            <p className="text-[11px] font-semibold text-slate-500">No manual trigger needed; verification runs continuously.</p>
          </div>
        </section>

        <section className="ui-card mt-4 p-4">
          <div className="mb-3 flex items-center justify-between text-xs font-medium">
            <span className="ui-note-xs">Model</span>
            <span className={modelReady ? "ui-status-ok" : "ui-status-pending"}>
              {modelReady ? "Ready" : modelLoading ? `${modelPercent}%` : "Pending"}
            </span>
          </div>
          <div className="ui-progress-track">
            <div
              className="ui-progress-bar"
              style={{ width: `${modelReady ? 100 : modelPercent}%` }}
            />
          </div>
          {modelError ? <p className="ui-note-error mt-2">{modelError}</p> : null}
        </section>

        <section className="ui-card mt-4 p-4">
          <div className="relative overflow-hidden rounded-[24px]">
            <LiveCamera
              facingMode="user"
              videoClassName="aspect-video w-full rounded-[24px] bg-slate-950 object-cover"
              onReady={(video) => {
                setCameraReady(true);
                setCameraError(null);
                setVideoElement(video);
                setFaceState("SCANNING");
              }}
              onError={(error) => {
                setCameraReady(false);
                setCameraError(error.message);
                setStatusMessage("Camera error. Check permission and retry.");
              }}
            />
            {showMatchAnimation ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/15">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-200 bg-emerald-500 text-white shadow-[0_16px_40px_rgba(16,185,129,0.45)]"
                  style={{ animation: "verify-match-pop 560ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                >
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            ) : null}
          </div>

          {cameraError ? <p className="ui-note-error mt-2">{cameraError}</p> : null}
          {cooldownHint ? <p className="ui-note-warn mt-2">{cooldownHint}</p> : null}

          <button
            type="button"
            onClick={() => {
              void attemptVerify();
            }}
            disabled={verifyDisabled}
            className="ui-btn ui-btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isVerifying ? "Verifying..." : "Verify Now (Fallback)"}
          </button>
          <p className="ui-note-xs mt-2">
            Geofence policy: {defaultOfficeGeofencePolicy.radiusM}m
          </p>
          <p className="ui-note-xs">
            Evidence policy: max {Math.round(runtimePolicy.evidencePolicy.maxBytes / 1024)}KB, q{runtimePolicy.evidencePolicy.jpegQuality.toFixed(2)}, width {runtimePolicy.evidencePolicy.maxWidth}px
          </p>
        </section>
      </main>
      <style>{`
        @keyframes verify-match-pop {
          0% {
            opacity: 0;
            transform: scale(0.6);
          }
          65% {
            opacity: 1;
            transform: scale(1.06);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
