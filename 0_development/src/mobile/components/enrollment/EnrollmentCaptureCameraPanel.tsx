import type { FaceBox, FacePoint } from "../../../services/face";
import LiveCamera from "../../../components/Camera/LiveCamera";
import FaceGuideOverlay from "./FaceGuideOverlay";

interface EnrollmentCaptureCameraPanelProps {
  modelReady: boolean;
  modelLoading: boolean;
  modelPercent: number;
  modelError: string | null;
  cameraError: string | null;
  videoElement: HTMLVideoElement | null;
  faceGuideBox: FaceBox | null;
  faceGuideLandmarks: FacePoint[];
  onCameraReady: (video: HTMLVideoElement) => void;
  onCameraError: (error: Error) => void;
}

export default function EnrollmentCaptureCameraPanel({
  modelReady,
  modelLoading,
  modelPercent,
  modelError,
  cameraError,
  videoElement,
  faceGuideBox,
  faceGuideLandmarks,
  onCameraReady,
  onCameraError,
}: EnrollmentCaptureCameraPanelProps) {
  return (
    <section className="absolute inset-0">
      {modelReady ? (
        <LiveCamera
          facingMode="user"
          onReady={onCameraReady}
          onError={onCameraError}
          className="h-full w-full"
          videoClassName="h-full w-full object-cover bg-slate-950"
          showStatusText={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-950">
          <div className="rounded-2xl border border-white/20 bg-black/45 px-4 py-3 text-center backdrop-blur-md">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            <p className="text-xs font-semibold text-white">
              {modelLoading ? `Loading model ${Math.max(0, Math.min(100, modelPercent))}%` : "Preparing model..."}
            </p>
            <p className="mt-1 text-[11px] text-white/70">Camera will start after model is ready.</p>
            {modelLoading ? (
              <>
                <p
                  className="mt-1.5 text-[11px] font-medium text-amber-200 opacity-0"
                  style={{ animation: "enroll-slow-hint 1ms linear 15s forwards" }}
                >
                  Network is slow. Please wait a moment, then retry if needed.
                </p>
                <style>{`
                  @keyframes enroll-slow-hint {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                  }
                `}</style>
              </>
            ) : null}
          </div>
        </div>
      )}
      <FaceGuideOverlay
        videoElement={videoElement}
        box={faceGuideBox}
        landmarks={faceGuideLandmarks}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/65" />

      {modelError ? (
        <p className="absolute left-4 right-4 top-4 z-20 rounded-xl border border-red-300/40 bg-red-900/65 px-3 py-2 text-xs font-semibold text-red-100 backdrop-blur-md">
          {modelError}
        </p>
      ) : null}
      {cameraError ? (
        <p className="absolute left-4 right-4 top-16 z-20 rounded-xl border border-red-300/40 bg-red-900/65 px-3 py-2 text-xs font-semibold text-red-100 backdrop-blur-md">
          {cameraError}
        </p>
      ) : null}
    </section>
  );
}
