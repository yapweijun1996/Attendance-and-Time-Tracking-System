import { faceRuntimeLoader, type FaceRuntimeState } from "./face-runtime";

export interface FaceProfile {
  id: string;
  name?: string;
  descriptors: Array<Float32Array | number[]>;
  meanDescriptor?: Float32Array | number[];
}

export interface DetectFaceResult {
  descriptor: Float32Array;
  score: number;
}

export interface MatchFaceResult {
  matched: boolean;
  userId: string | null;
  name: string | null;
  distance: number;
  threshold: number;
}

export type FaceModelStage = "tiny" | "landmark" | "recognition";
export type FaceModelStageStatus = "pending" | "loading" | "loaded";

export interface FaceModelLoadProgress {
  stage: FaceModelStage;
  status: FaceModelStageStatus;
  completed: number;
  total: number;
  percent: number;
  stageElapsedMs: number | null;
  totalElapsedMs: number;
}
class FaceAPIService {
  private static instance: FaceAPIService;
  private modelPath = "/models";
  private modelsLoaded = false;
  private modelLoadPromise: Promise<void> | null = null;
  private matchThreshold = 0.6;
  private detectorInputSize = 320;
  private detectorScoreThreshold = 0.5;
  private registeredProfiles: FaceProfile[] = [];

  private constructor() {}

  static getInstance(): FaceAPIService {
    if (!FaceAPIService.instance) {
      FaceAPIService.instance = new FaceAPIService();
    }
    return FaceAPIService.instance;
  }

  async loadModels(
    modelPath = "/models",
    onProgress?: (progress: FaceModelLoadProgress) => void
  ): Promise<void> {
    if (this.modelsLoaded) {
      onProgress?.({
        stage: "recognition",
        status: "loaded",
        completed: 3,
        total: 3,
        percent: 100,
        stageElapsedMs: 0,
        totalElapsedMs: 0,
      });
      return;
    }

    if (this.modelLoadPromise) {
      await this.modelLoadPromise;
      onProgress?.({
        stage: "recognition",
        status: "loaded",
        completed: 3,
        total: 3,
        percent: 100,
        stageElapsedMs: null,
        totalElapsedMs: 0,
      });
      return;
    }

    this.modelLoadPromise = this.loadModelsInternal(modelPath, onProgress).finally(() => {
      this.modelLoadPromise = null;
    });
    await this.modelLoadPromise;
  }

  private async loadModelsInternal(
    modelPath: string,
    onProgress?: (progress: FaceModelLoadProgress) => void
  ): Promise<void> {
    const faceApi = await faceRuntimeLoader.getFaceApi();

    const total = 3;
    let completed = 0;
    const totalStartedAt = performance.now();
    const reportProgress = (
      stage: FaceModelStage,
      status: FaceModelStageStatus,
      stageElapsedMs: number | null = null
    ) => {
      const percent = Math.round((completed / total) * 100);
      onProgress?.({
        stage,
        status,
        completed,
        total,
        percent,
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
    reportProgress(
      "landmark",
      "loaded",
      Math.round(performance.now() - landmarkStartedAt)
    );

    const recognitionStartedAt = performance.now();
    reportProgress("recognition", "loading");
    await faceApi.nets.faceRecognitionNet.loadFromUri(modelPath);
    completed += 1;
    reportProgress(
      "recognition",
      "loaded",
      Math.round(performance.now() - recognitionStartedAt)
    );

    await this.warmupDetector(faceApi);

    this.modelPath = modelPath;
    this.modelsLoaded = true;
  }

  async preloadRuntime(): Promise<FaceRuntimeState> {
    return faceRuntimeLoader.preloadRuntime();
  }

  getRuntimeState(): FaceRuntimeState {
    return faceRuntimeLoader.getRuntimeState();
  }

  getModelState(): { loaded: boolean; path: string } {
    return {
      loaded: this.modelsLoaded,
      path: this.modelPath,
    };
  }

  setProfiles(profiles: FaceProfile[]): void {
    this.registeredProfiles = profiles.map((profile) => ({
      ...profile,
      descriptors: profile.descriptors.map((descriptor) =>
        this.toFloat32Array(descriptor)
      ),
      meanDescriptor: profile.meanDescriptor
        ? this.toFloat32Array(profile.meanDescriptor)
        : undefined,
    }));
  }

  setMatchThreshold(threshold: number): void {
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
      throw new Error("Match threshold must be a finite number in (0, 1].");
    }
    this.matchThreshold = threshold;
  }

  async detectFace(videoElement: HTMLVideoElement): Promise<DetectFaceResult | null> {
    if (!this.modelsLoaded) {
      throw new Error("Face models are not loaded. Call loadModels() first.");
    }

    const faceApi = await faceRuntimeLoader.getFaceApi();
    const detection = await faceApi
      .detectSingleFace(
        videoElement,
        new faceApi.TinyFaceDetectorOptions({
          inputSize: this.detectorInputSize,
          scoreThreshold: this.detectorScoreThreshold,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return {
      descriptor: detection.descriptor,
      score: detection.detection.score,
    };
  }

  matchFace(descriptor: Float32Array | number[], threshold = this.matchThreshold): MatchFaceResult {
    if (this.registeredProfiles.length === 0) {
      return {
        matched: false,
        userId: null,
        name: null,
        distance: Number.POSITIVE_INFINITY,
        threshold,
      };
    }

    const query = this.toFloat32Array(descriptor);
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestProfile: FaceProfile | null = null;

    for (const profile of this.registeredProfiles) {
      const candidates =
        profile.meanDescriptor !== undefined
          ? [profile.meanDescriptor]
          : profile.descriptors;

      for (const candidate of candidates) {
        const distance = this.euclideanDistance(query, this.toFloat32Array(candidate));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestProfile = profile;
        }
      }
    }

    const matched = bestDistance < threshold;
    return {
      matched,
      userId: matched && bestProfile ? bestProfile.id : null,
      name: matched && bestProfile ? bestProfile.name ?? bestProfile.id : null,
      distance: bestDistance,
      threshold,
    };
  }

  private toFloat32Array(input: Float32Array | number[]): Float32Array {
    return input instanceof Float32Array ? input : new Float32Array(input);
  }

  private euclideanDistance(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error("Descriptor length mismatch.");
    }

    let sum = 0;
    for (let i = 0; i < a.length; i += 1) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private async warmupDetector(
    faceApi: Awaited<ReturnType<typeof faceRuntimeLoader.getFaceApi>>
  ): Promise<void> {
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
            inputSize: this.detectorInputSize,
            scoreThreshold: this.detectorScoreThreshold,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
    } catch {
      // Warmup is best-effort; ignore failures and keep main flow successful.
    }
  }
}

const faceAPIService = FaceAPIService.getInstance();

export { FaceAPIService, faceAPIService };
