export interface FacePoint {
  x: number;
  y: number;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceProfile {
  id: string;
  name?: string;
  descriptors: Array<Float32Array | number[]>;
  meanDescriptor?: Float32Array | number[];
}

export interface DetectFaceResult {
  descriptor: Float32Array;
  score: number;
  box: FaceBox;
  landmarks: FacePoint[];
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
