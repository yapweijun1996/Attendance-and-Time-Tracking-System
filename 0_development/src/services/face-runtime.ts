import { resolveBasePath } from "../utils/base-path";

export interface FaceApiDetection {
  descriptor: Float32Array;
  detection: {
    score: number;
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  landmarks: {
    positions: Array<{ x: number; y: number }>;
  };
}

export interface FaceApiRuntime {
  tf?: TfRuntime;
  nets: {
    tinyFaceDetector: { loadFromUri: (path: string) => Promise<void> };
    faceLandmark68Net: { loadFromUri: (path: string) => Promise<void> };
    faceRecognitionNet: { loadFromUri: (path: string) => Promise<void> };
  };
  TinyFaceDetectorOptions: new (options: {
    inputSize: number;
    scoreThreshold: number;
  }) => unknown;
  detectSingleFace: (
    input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    options: unknown
  ) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<FaceApiDetection | null>;
    };
  };
}

interface TfRuntime {
  wasm?: {
    setWasmPaths: (path: string) => void;
  };
  setBackend?: (backend: string) => Promise<boolean>;
  ready?: () => Promise<void>;
  getBackend?: () => string;
}

interface FaceRuntimeWindow extends Window {
  faceapi?: FaceApiRuntime;
  tf?: TfRuntime;
}

export interface FaceRuntimeState {
  ready: boolean;
  backend: string | null;
}

class FaceRuntimeLoader {
  private faceApi: FaceApiRuntime | null = null;
  private runtimeReady: Promise<void> | null = null;
  private readonly faceApiScriptPath = resolveBasePath("vendor/face-api.js");
  private readonly tfWasmAssetPath = resolveBasePath("vendor/");

  private getRuntimeWindow(): FaceRuntimeWindow {
    return window as FaceRuntimeWindow;
  }

  private async loadScript(src: string): Promise<void> {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-satts-src="${src}"]`
    );

    if (existing?.dataset.sattsReady === "true") {
      return;
    }

    if (existing) {
      await new Promise<void>((resolve, reject) => {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error(`Failed to load runtime script: ${src}`)),
          { once: true }
        );
      });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.sattsSrc = src;
      script.addEventListener(
        "load",
        () => {
          script.dataset.sattsReady = "true";
          resolve();
        },
        { once: true }
      );
      script.addEventListener(
        "error",
        () => reject(new Error(`Failed to load runtime script: ${src}`)),
        { once: true }
      );
      document.head.appendChild(script);
    });
  }

  private async ensureRuntime(): Promise<void> {
    if (this.runtimeReady) {
      return this.runtimeReady;
    }

    this.runtimeReady = (async () => {
      if (typeof window === "undefined") {
        throw new Error(
          "Face API models require browser runtime. Node mode can still use matchFace with pre-computed descriptors."
        );
      }

      const runtimeWindow = this.getRuntimeWindow();

      if (!runtimeWindow.faceapi) {
        await this.loadScript(this.faceApiScriptPath);
      }
      if (!runtimeWindow.faceapi) {
        throw new Error("Face API runtime failed to initialize.");
      }

      await this.configureBackend(runtimeWindow.faceapi.tf ?? runtimeWindow.tf);
      this.faceApi = runtimeWindow.faceapi;
    })().catch((error) => {
      this.runtimeReady = null;
      throw error;
    });

    return this.runtimeReady;
  }

  async getFaceApi(): Promise<FaceApiRuntime> {
    if (!this.faceApi) {
      await this.ensureRuntime();
    }
    if (!this.faceApi) {
      throw new Error("Face API runtime unavailable.");
    }
    return this.faceApi;
  }

  async preloadRuntime(): Promise<FaceRuntimeState> {
    await this.ensureRuntime();
    return this.getRuntimeState();
  }

  getRuntimeState(): FaceRuntimeState {
    const runtimeWindow = this.getRuntimeWindow();
    const backend =
      runtimeWindow.faceapi?.tf?.getBackend?.() ?? runtimeWindow.tf?.getBackend?.() ?? null;
    return {
      ready: this.faceApi !== null,
      backend,
    };
  }

  private async configureBackend(tfRuntime: TfRuntime | undefined): Promise<void> {
    if (!tfRuntime?.setBackend || !tfRuntime.ready) {
      return;
    }

    const preferredBackends: Array<"wasm" | "cpu"> = ["wasm", "cpu"];
    for (const backend of preferredBackends) {
      try {
        if (backend === "wasm") {
          tfRuntime.wasm?.setWasmPaths(this.tfWasmAssetPath);
        }

        const switched = await tfRuntime.setBackend(backend);
        if (!switched) {
          continue;
        }

        await tfRuntime.ready();
        return;
      } catch (error) {
        console.warn(`[SATTS][FaceRuntime] Failed to activate ${backend} backend`, error);
      }
    }
  }
}

const faceRuntimeLoader = new FaceRuntimeLoader();

export { FaceRuntimeLoader, faceRuntimeLoader };
