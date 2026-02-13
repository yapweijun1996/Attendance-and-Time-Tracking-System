import { faceRuntimeLoader, type FaceRuntimeState } from "./face-runtime";
import { matchFaceDescriptor, normalizeProfiles } from "./face-core/matcher";
import { createLoadedProgress, loadFaceModels } from "./face-core/models";
import type {
  DetectFaceResult,
  FaceModelLoadProgress,
  FaceProfile,
  MatchFaceResult,
} from "./face-core/types";

export type {
  DetectFaceResult,
  FaceBox,
  FaceModelLoadProgress,
  FaceModelStage,
  FaceModelStageStatus,
  FacePoint,
  FaceProfile,
  MatchFaceResult,
} from "./face-core/types";

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
      onProgress?.(createLoadedProgress());
      return;
    }

    if (this.modelLoadPromise) {
      await this.modelLoadPromise;
      onProgress?.(createLoadedProgress());
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
    await loadFaceModels({
      faceApi,
      modelPath,
      detectorInputSize: this.detectorInputSize,
      detectorScoreThreshold: this.detectorScoreThreshold,
      onProgress,
    });
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
    this.registeredProfiles = normalizeProfiles(profiles);
  }

  setMatchThreshold(threshold: number): void {
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
      throw new Error("Match threshold must be a finite number in (0, 1].");
    }
    this.matchThreshold = threshold;
  }

  async detectFace(
    inputElement: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectFaceResult | null> {
    if (!this.modelsLoaded) {
      throw new Error("Face models are not loaded. Call loadModels() first.");
    }

    const faceApi = await faceRuntimeLoader.getFaceApi();
    const detection = await faceApi
      .detectSingleFace(
        inputElement,
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
      box: {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height,
      },
      landmarks: detection.landmarks.positions.map((position) => ({
        x: position.x,
        y: position.y,
      })),
    };
  }

  matchFace(descriptor: Float32Array | number[], threshold = this.matchThreshold): MatchFaceResult {
    return matchFaceDescriptor(this.registeredProfiles, descriptor, threshold);
  }
}

const faceAPIService = FaceAPIService.getInstance();

export { FaceAPIService, faceAPIService };
