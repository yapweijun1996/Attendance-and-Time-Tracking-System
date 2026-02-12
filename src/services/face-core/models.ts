import type {
  FaceModelLoadProgress,
  FaceModelStage,
  FaceModelStageStatus,
} from "./types";

interface LoadFaceModelsInput {
  faceApi: Awaited<ReturnType<typeof import("../face-runtime").faceRuntimeLoader.getFaceApi>>;
  modelPath: string;
  detectorInputSize: number;
  detectorScoreThreshold: number;
  onProgress?: (progress: FaceModelLoadProgress) => void;
}

export function createLoadedProgress(): FaceModelLoadProgress {
  return {
    stage: "recognition",
    status: "loaded",
    completed: 3,
    total: 3,
    percent: 100,
    stageElapsedMs: null,
    totalElapsedMs: 0,
  };
}

export async function loadFaceModels({
  faceApi,
  modelPath,
  detectorInputSize,
  detectorScoreThreshold,
  onProgress,
}: LoadFaceModelsInput): Promise<void> {
  const total = 3;
  let completed = 0;
  const totalStartedAt = performance.now();

  const reportProgress = (
    stage: FaceModelStage,
    status: FaceModelStageStatus,
    stageElapsedMs: number | null = null
  ) => {
    onProgress?.({
      stage,
      status,
      completed,
      total,
      percent: Math.round((completed / total) * 100),
      stageElapsedMs,
      totalElapsedMs: Math.round(performance.now() - totalStartedAt),
    });
  };

  const tinyStartedAt = performance.now();
  reportProgress("tiny", "loading");
  await faceApi.nets.tinyFaceDetector.loadFromUri(modelPath);
  completed += 1;
  reportProgress("tiny", "loaded", Math.round(performance.now() - tinyStartedAt));

  const landmarkStartedAt = performance.now();
  reportProgress("landmark", "loading");
  await faceApi.nets.faceLandmark68Net.loadFromUri(modelPath);
  completed += 1;
  reportProgress("landmark", "loaded", Math.round(performance.now() - landmarkStartedAt));

  const recognitionStartedAt = performance.now();
  reportProgress("recognition", "loading");
  await faceApi.nets.faceRecognitionNet.loadFromUri(modelPath);
  completed += 1;
  reportProgress("recognition", "loaded", Math.round(performance.now() - recognitionStartedAt));

  await warmupDetector({
    faceApi,
    detectorInputSize,
    detectorScoreThreshold,
  });
}

async function warmupDetector({
  faceApi,
  detectorInputSize,
  detectorScoreThreshold,
}: {
  faceApi: Awaited<ReturnType<typeof import("../face-runtime").faceRuntimeLoader.getFaceApi>>;
  detectorInputSize: number;
  detectorScoreThreshold: number;
}): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 120;
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);

  try {
    await faceApi
      .detectSingleFace(
        canvas,
        new faceApi.TinyFaceDetectorOptions({
          inputSize: detectorInputSize,
          scoreThreshold: detectorScoreThreshold,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();
  } catch {
    // Warmup is best-effort; ignore failures and keep main flow successful.
  }
}
