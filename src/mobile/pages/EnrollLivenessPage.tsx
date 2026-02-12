import { useCallback, useEffect, useState } from "react";

import LiveCamera from "../../components/Camera/LiveCamera";
import type { FaceModelLoadProgress } from "../../services/face";
import { saveEnrollmentProfile } from "../services/enrollment";
import { clearEnrollmentDraft, readEnrollmentDraft } from "../services/enrollment-draft";

const PASSIVE_LIVENESS_MIN_SCORE = 0.65;

interface EnrollLivenessPageProps {
  consentAcceptedAt: string | null;
  descriptors: number[][];
  photos: string[];
  onBack: () => void;
  onRestart: () => void;
  onSaved: (message: string) => void;
}

export default function EnrollLivenessPage({
  consentAcceptedAt,
  descriptors,
  photos,
  onBack,
  onRestart,
  onSaved,
}: EnrollLivenessPageProps) {
  const [bootDraft] = useState(() => readEnrollmentDraft());
  const effectiveConsentAcceptedAt = consentAcceptedAt ?? bootDraft.consentAcceptedAt;
  const effectiveDescriptors = descriptors.length > 0 ? descriptors : bootDraft.descriptors;
  const effectivePhotos = photos.length > 0 ? photos : bootDraft.photos;

  const [modelPercent, setModelPercent] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [checkBusy, setCheckBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Run passive liveness check.");
  const [livenessScore, setLivenessScore] = useState<number | null>(null);
  const [livenessPassedAt, setLivenessPassedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        if (!cancelled) {
          setModelError(error instanceof Error ? error.message : "Failed to load face model.");
        }
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

  const handlePassiveCheck = useCallback(async () => {
    if (!videoElement || !cameraReady || !modelReady || checkBusy) {
      return;
    }

    setCheckBusy(true);
    setSaveError(null);
    try {
      const { faceAPIService } = await import("../../services/face");
      const detection = await faceAPIService.detectFace(videoElement);
      if (!detection) {
        setLivenessPassedAt(null);
        setLivenessScore(null);
        setStatusMessage("No face detected. Keep face centered and retry.");
        return;
      }

      setLivenessScore(detection.score);
      if (detection.score < PASSIVE_LIVENESS_MIN_SCORE) {
        setLivenessPassedAt(null);
        setStatusMessage(
          `Liveness not passed (score ${detection.score.toFixed(3)}). Improve lighting and retry.`
        );
        return;
      }

      setLivenessPassedAt(new Date().toISOString());
      setStatusMessage(`Liveness passed (score ${detection.score.toFixed(3)}). You can save enrollment.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Passive liveness check failed.");
    } finally {
      setCheckBusy(false);
    }
  }, [cameraReady, checkBusy, modelReady, videoElement]);

  const handleSave = useCallback(async () => {
    if (!effectiveConsentAcceptedAt) {
      setSaveError("Consent timestamp is missing. Restart enrollment.");
      return;
    }
    if (effectiveDescriptors.length === 0) {
      setSaveError("No descriptors captured. Restart enrollment.");
      return;
    }
    if (effectivePhotos.length === 0) {
      setSaveError("No enrollment photos captured. Restart enrollment.");
      return;
    }
    if (!livenessPassedAt || livenessScore === null) {
      setSaveError("Passive liveness check is not completed.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const profile = await saveEnrollmentProfile({
        descriptors: effectiveDescriptors,
        photos: effectivePhotos,
        consentAcceptedAt: effectiveConsentAcceptedAt,
        liveness: {
          mode: "PASSIVE_SCORE",
          passedAt: livenessPassedAt,
          confidence: livenessScore,
        },
      });

      // Sync in-memory matcher with latest profile descriptors.
      const { faceAPIService } = await import("../../services/face");
      faceAPIService.setProfiles([
        {
          id: profile.staffId,
          name: profile.name,
          descriptors: profile.faceDescriptors,
        },
      ]);

      clearEnrollmentDraft();
      onSaved(`Enrollment saved (${profile.faceDescriptors.length} descriptors, ${effectivePhotos.length} photos).`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save enrollment profile.");
    } finally {
      setSaving(false);
    }
  }, [
    effectiveConsentAcceptedAt,
    effectiveDescriptors,
    effectivePhotos,
    livenessPassedAt,
    livenessScore,
    onSaved,
  ]);

  if (!effectiveConsentAcceptedAt || effectiveDescriptors.length === 0 || effectivePhotos.length === 0) {
    return (
      <div className="ui-page-flow">
        <main className="ui-main-flow">
          <h1 className="ui-title text-xl">Enrollment Liveness</h1>
          <p className="ui-note-warn mt-2">
            Missing capture context. Restart from consent and capture steps.
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="ui-btn ui-btn-primary mt-4 w-full"
          >
            Restart Enrollment
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

        <h1 className="ui-title text-xl">Enrollment Liveness</h1>
        <p className="ui-note mt-1">{statusMessage}</p>

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
              void handlePassiveCheck();
            }}
            disabled={!modelReady || !cameraReady || checkBusy}
            className="ui-btn ui-btn-primary mt-3 w-full disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {checkBusy ? "Checking..." : "Run Passive Liveness"}
          </button>

          <p className="ui-note-xs mt-2">
            Passive threshold: score must be &gt;= {PASSIVE_LIVENESS_MIN_SCORE.toFixed(2)}.
          </p>
          {livenessScore !== null ? (
            <p className="ui-note-xs">Latest score: {livenessScore.toFixed(3)}</p>
          ) : null}
        </section>

        {saveError ? <p className="ui-note-error mt-3">{saveError}</p> : null}

        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={!livenessPassedAt || saving}
          className="ui-btn ui-btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {saving ? "Saving..." : "Save Enrollment"}
        </button>
      </main>
    </div>
  );
}
