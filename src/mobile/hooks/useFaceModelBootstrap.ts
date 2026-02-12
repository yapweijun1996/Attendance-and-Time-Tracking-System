import { useEffect, useState } from "react";

import type { FaceModelLoadProgress } from "../../services/face";

interface FaceModelBootstrapState {
  modelPercent: number;
  modelReady: boolean;
  modelLoading: boolean;
  modelError: string | null;
}

export function useFaceModelBootstrap(): FaceModelBootstrapState {
  const [modelPercent, setModelPercent] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);

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

  return {
    modelPercent,
    modelReady,
    modelLoading,
    modelError,
  };
}
