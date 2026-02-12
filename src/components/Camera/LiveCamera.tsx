import { useEffect, useRef, useState } from "react";

interface LiveCameraProps {
  facingMode?: "user" | "environment";
  className?: string;
  videoClassName?: string;
  showStatusText?: boolean;
  statusClassName?: string;
  onReady?: (videoElement: HTMLVideoElement) => void;
  onError?: (error: Error) => void;
}

export default function LiveCamera({
  facingMode = "user",
  className,
  videoClassName,
  showStatusText = true,
  statusClassName,
  onReady,
  onError,
}: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);

  // Keep latest callbacks without forcing camera stream restart on every parent render.
  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onError, onReady]);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onErrorRef.current?.(new Error("This browser does not support camera access."));
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
        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!mounted) {
          return;
        }

        setReady(true);
        onReadyRef.current?.(videoRef.current);
      } catch (error) {
        const message =
          error instanceof Error ? error : new Error("Unable to access camera.");
        onErrorRef.current?.(message);
      }
    };

    void start();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setReady(false);
    };
  }, [facingMode]);

  return (
    <div className={className}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={videoClassName ?? "w-full rounded-xl bg-slate-950"}
      />
      {showStatusText ? (
        <p className={statusClassName ?? "mt-2 text-xs text-slate-600"}>
          {ready ? "Camera ready" : "Starting camera..."}
        </p>
      ) : null}
    </div>
  );
}
