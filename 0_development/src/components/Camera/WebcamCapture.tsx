import { useCallback, useEffect, useRef, useState } from "react";

interface WebcamCaptureProps {
  onCapture: (file: Blob) => void;
  onError?: (error: Error) => void;
  facingMode?: "user" | "environment";
  className?: string;
}

export default function WebcamCapture({
  onCapture,
  onError,
  facingMode = "user",
  className,
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reportError = useCallback((error: Error) => {
    onErrorRef.current?.(error);
  }, []);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        const error = new Error("This browser does not support camera access.");
        reportError(error);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24, max: 30 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (cause) {
        const error =
          cause instanceof Error ? cause : new Error("Unable to access camera.");
        reportError(error);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facingMode, reportError]);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      reportError(new Error("Camera is not initialized."));
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      reportError(new Error("Video stream is not ready."));
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      reportError(new Error("Canvas context is unavailable."));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reportError(new Error("Failed to capture frame."));
          return;
        }
        onCapture(blob);
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture, reportError]);

  return (
    <div className={className}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full rounded-lg bg-slate-950"
      />
      <button
        type="button"
        onClick={captureImage}
        disabled={!ready}
        className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Capture
      </button>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
