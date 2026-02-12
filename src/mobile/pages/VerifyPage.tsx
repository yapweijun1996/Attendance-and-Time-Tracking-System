import { useCallback, useEffect, useMemo, useState } from "react";
import LiveCamera from "../../components/Camera/LiveCamera";
import type { FaceModelLoadProgress } from "../../services/face";
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
} from "../services/evidence";
import {
  captureGeolocation,
  defaultOfficeGeofencePolicy,
} from "../services/geofence";
import { verifyAgainstActiveEnrollment } from "../services/verify-face";
import type { AttendanceAction, SyncState, VerificationReasonCode, VerificationResult } from "../types";

interface VerifyPageProps {
  action: AttendanceAction;
  onBack: () => void;
  onCompleted: (result: VerificationResult) => void;
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

export default function VerifyPage({ action, onBack, onCompleted }: VerifyPageProps) {
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

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      setModelLoading(true);
      setModelError(null);
      try {
        const { faceAPIService } = await import("../../services/face");
        await faceAPIService.loadModels("/models", (progress: FaceModelLoadProgress) => {
          if (cancelled) {
            return;
          }
          setModelPercent(progress.percent);
        });
        if (cancelled) {
          return;
        }
        setModelReady(true);
        setStatusMessage("Face model ready. You can verify now.");
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

  const handleVerify = useCallback(async () => {
    if (!videoElement || !cameraReady || !modelReady) {
      return;
    }
    if (!verifySubmissionLock.acquire(action)) {
      return;
    }

    setIsVerifying(true);
    setCooldownHint(null);
    setStatusMessage("Verifying face and creating local event...");

    try {
      const cooldown = await checkActionCooldown(action, DEFAULT_COOLDOWN_SEC);
      if (!cooldown.allowed) {
        setCooldownHint(`Cooldown active. Retry in ${cooldown.remainingSec}s (${action}).`);
        onCompleted({
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

      setStatusMessage("Verifying face against enrollment profile...");
      const verifyGate = await verifyAgainstActiveEnrollment(action, videoElement);
      if (!verifyGate.ok) {
        onCompleted(verifyGate.result);
        return;
      }
      const { detection, staffId } = verifyGate;

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
        defaultEvidencePolicy
      );

      const attendanceLog = createAttendanceLog({
        eventId,
        staffId,
        action,
        clientTs,
        syncState,
        verifyScore: detection.score,
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
        onCompleted({
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

      onCompleted({
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
      onCompleted({
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
      verifySubmissionLock.release(action);
    }
  }, [action, cameraReady, modelReady, onCompleted, videoElement]);

  const verifyDisabled = useMemo(
    () => !cameraReady || !modelReady || isVerifying || modelLoading,
    [cameraReady, isVerifying, modelLoading, modelReady]
  );

  return (
    <div className="ui-page-flow">
      <main className="ui-main-flow">
        <button type="button" onClick={onBack} className="ui-back-btn">
          Back
        </button>

        <h1 className="ui-title text-xl">
          Verify {action === "IN" ? "Time In" : "Time Out"}
        </h1>
        <p className="ui-note mt-1">{statusMessage}</p>

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
              setStatusMessage("Camera error. Check permission and retry.");
            }}
          />
          {cameraError ? <p className="ui-note-error mt-2">{cameraError}</p> : null}
          {cooldownHint ? <p className="ui-note-warn mt-2">{cooldownHint}</p> : null}

          <button
            type="button"
            onClick={() => {
              void handleVerify();
            }}
            disabled={verifyDisabled}
            className="ui-btn ui-btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isVerifying ? "Verifying..." : "Verify And Save"}
          </button>
          <p className="ui-note-xs mt-2">
            Geofence policy: {defaultOfficeGeofencePolicy.radiusM}m
          </p>
          <p className="ui-note-xs">Evidence policy: max {Math.round(defaultEvidencePolicy.maxBytes / 1024)}KB, q{defaultEvidencePolicy.jpegQuality.toFixed(1)}</p>
        </section>
      </main>
    </div>
  );
}
