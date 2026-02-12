import { useEffect, useRef, useState } from "react";

import EnrollmentCaptureCameraPanel from "../components/enrollment/EnrollmentCaptureCameraPanel";
import EnrollmentCaptureConsentNotice from "../components/enrollment/EnrollmentCaptureConsentNotice";
import CapturedPhotoGallery from "../components/enrollment/CapturedPhotoGallery";
import { useEnrollmentCaptureFlow } from "../hooks/useEnrollmentCaptureFlow";

interface EnrollCapturePageProps {
  consentAcceptedAt: string | null;
  initialDescriptors: number[][];
  initialPhotos: string[];
  onBack: () => void;
  onReset: () => void;
  onCompleted: (payload: { descriptors: number[][]; photos: string[] }) => void;
}

function statePillClass(state: string): string {
  if (state === "TOO_SIMILAR") {
    return "border-amber-300/35 bg-amber-400/15 text-amber-100";
  }
  if (state === "LOW_CONFIDENCE") {
    return "border-red-300/35 bg-red-400/15 text-red-100";
  }
  if (state === "CAPTURED") {
    return "border-emerald-300/35 bg-emerald-400/15 text-emerald-100";
  }
  return "border-white/25 bg-black/55 text-white";
}

export default function EnrollCapturePage(props: EnrollCapturePageProps) {
  const flow = useEnrollmentCaptureFlow(props);
  const [previewOpen, setPreviewOpen] = useState(false);
  const shouldResumeAfterPreviewRef = useRef(false);
  const autoContinueCountRef = useRef<number>(-1);
  const hasConsent = flow.hasConsent;
  const descriptorCount = flow.descriptors.length;
  const captureTarget = flow.captureTarget;
  const canContinue = descriptorCount >= captureTarget;
  const handleContinue = flow.handleContinue;
  const autoCaptureEnabled = flow.autoCaptureEnabled;
  const toggleAutoCapture = flow.handleToggleAutoCapture;

  useEffect(() => {
    // Pause auto capture while fullscreen preview is open and restore only if we paused it.
    if (previewOpen && autoCaptureEnabled) {
      toggleAutoCapture();
      shouldResumeAfterPreviewRef.current = true;
      return;
    }
    if (!previewOpen && shouldResumeAfterPreviewRef.current && !autoCaptureEnabled) {
      toggleAutoCapture();
      shouldResumeAfterPreviewRef.current = false;
    }
  }, [autoCaptureEnabled, previewOpen, toggleAutoCapture]);

  useEffect(() => {
    // Once target is reached, move to next step automatically.
    if (!hasConsent || !canContinue || previewOpen) {
      return;
    }
    if (autoContinueCountRef.current === descriptorCount) {
      return;
    }
    autoContinueCountRef.current = descriptorCount;
    handleContinue();
  }, [canContinue, descriptorCount, handleContinue, hasConsent, previewOpen]);

  if (!hasConsent) {
    return <EnrollmentCaptureConsentNotice onBack={props.onBack} />;
  }

  const activeState = flow.captureState === "COMPLETED" ? "CAPTURED" : flow.captureState;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <EnrollmentCaptureCameraPanel
        modelReady={flow.modelReady}
        modelLoading={flow.modelLoading}
        modelPercent={flow.modelPercent}
        modelError={flow.modelError}
        cameraError={flow.cameraError}
        videoElement={flow.videoElement}
        faceGuideBox={flow.faceGuideBox}
        faceGuideLandmarks={flow.faceGuideLandmarks}
        onCameraReady={flow.handleCameraReady}
        onCameraError={flow.handleCameraError}
      />
      {descriptorCount > 0 ? (
        <div
          // Remounting on count change replays the shutter animation with near-zero JS overhead.
          key={`shutter-${descriptorCount}`}
          className="pointer-events-none absolute inset-0 z-30 opacity-0"
          style={{ animation: "enroll-shutter-flash 100ms ease-out" }}
        />
      ) : null}
      <style>{`
        @keyframes enroll-shutter-flash {
          0% {
            opacity: 0.25;
            background-color: rgb(255 255 255);
          }
          100% {
            opacity: 0;
            background-color: rgb(255 255 255);
          }
        }
      `}</style>

      <main className="relative z-20 flex min-h-screen flex-col p-3 sm:p-5">
        <header className="pointer-events-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={props.onBack}
            className="rounded-xl border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            <div
              className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold backdrop-blur-lg ${statePillClass(activeState)}`}
            >
              {activeState}
            </div>
            <div className="rounded-2xl border border-white/25 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-lg">
              {descriptorCount}/{captureTarget} · {flow.capturePercent}%
            </div>
          </div>
        </header>

        <div className="flex-1" />

        <section className="pointer-events-auto w-full max-w-[22rem] space-y-1.5 self-center pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:max-w-md">
          <div className="rounded-[22px] border border-white/25 bg-white/10 p-2.5 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={flow.handleToggleAutoCapture}
                className="rounded-xl border border-white/45 bg-white/15 px-2 py-1.5 text-xs font-semibold text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]"
              >
                {flow.autoCaptureEnabled ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                onClick={flow.handleReset}
                className="rounded-xl border border-white/45 bg-white/15 px-2 py-1.5 text-xs font-semibold text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]"
              >
                Reset
              </button>
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-white/85">
              Min difference per capture: {flow.minDescriptorDiffPercent}%.
              {flow.lastMinDiffPercent !== null
                ? ` Last min difference: ${flow.lastMinDiffPercent.toFixed(2)}%.`
                : ""}
            </p>
            {canContinue ? (
              <p className="mt-1 text-[10px] font-semibold text-emerald-200">
                Target reached. Moving to next step...
              </p>
            ) : null}
          </div>

          <CapturedPhotoGallery
            photos={flow.photos}
            mode="strip"
            onPreviewOpenChange={setPreviewOpen}
          />
        </section>
      </main>
    </div>
  );
}
