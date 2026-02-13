import { faceAPIService } from "../../services/face";
import { calculateFaceSharpness } from "../utils/sharpness";
import { evaluateFaceVisibility } from "../utils/face-visibility";
import {
  ENROLL_CAPTURE_TARGET,
  ENROLL_SAME_PERSON_MAX_DISTANCE,
  buildCaptureDiagnostics,
  euclideanDistance,
  resolveBlurThreshold,
} from "./enrollment-capture";

type ReviewReason =
  | "decode_failed"
  | "no_face"
  | "occluded"
  | "blurry"
  | "mixed_identity";

export interface EnrollmentQualityReviewResult {
  descriptors: number[][];
  photos: string[];
  reviewedCount: number;
  removedCount: number;
  removedReasons: Partial<Record<ReviewReason, number>>;
  primaryReason: ReviewReason | null;
}

interface ReviewInput {
  descriptors: number[][];
  photos: string[];
}

interface QualityGateInput {
  descriptors: number[][];
  photos: string[];
  captureBusy: boolean;
  onStart: (hint: string) => void;
  onNeedRecapture: (payload: { descriptors: number[][]; photos: string[]; removedCount: number; hint: string }) => void;
  onCompleted: (payload: { descriptors: number[][]; photos: string[] }) => void;
  onError: (message: string) => void;
  onFinally: () => void;
}

function addReasonCounter(
  counters: Partial<Record<ReviewReason, number>>,
  reason: ReviewReason
): void {
  counters[reason] = (counters[reason] ?? 0) + 1;
}

function resolvePrimaryReason(
  counters: Partial<Record<ReviewReason, number>>
): ReviewReason | null {
  let primaryReason: ReviewReason | null = null;
  let primaryCount = 0;
  const entries = Object.entries(counters) as Array<[ReviewReason, number]>;
  for (const [reason, count] of entries) {
    if (count > primaryCount) {
      primaryReason = reason;
      primaryCount = count;
    }
  }
  return primaryReason;
}

function estimateImageBrightness(imageElement: HTMLImageElement): number | null {
  const sourceWidth = imageElement.naturalWidth || imageElement.width;
  const sourceHeight = imageElement.naturalHeight || imageElement.height;
  if (!sourceWidth || !sourceHeight) {
    return null;
  }
  const sampleWidth = 64;
  const sampleHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * sampleWidth));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.drawImage(imageElement, 0, 0, sampleWidth, sampleHeight);
  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let luminanceSum = 0;
  const pixelCount = imageData.length / 4;
  for (let index = 0; index < imageData.length; index += 4) {
    const red = imageData[index];
    const green = imageData[index + 1];
    const blue = imageData[index + 2];
    luminanceSum += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }
  if (pixelCount === 0) {
    return null;
  }
  return luminanceSum / pixelCount;
}

function decodeEnrollmentPhoto(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode_failed"));
    image.src = `data:image/jpeg;base64,${base64}`;
  });
}

export function mapReviewReasonToHint(reason: ReviewReason | null): string {
  switch (reason) {
    case "decode_failed":
      return "图片解码失败";
    case "no_face":
      return "未检测到有效人脸";
    case "occluded":
      return "五官遮挡";
    case "blurry":
      return "画面模糊";
    case "mixed_identity":
      return "疑似混入他人";
    default:
      return "质量不达标";
  }
}

export async function reviewEnrollmentQuality(
  input: ReviewInput
): Promise<EnrollmentQualityReviewResult> {
  const reviewedCount = Math.min(input.descriptors.length, input.photos.length);
  const keptDescriptors: number[][] = [];
  const keptPhotos: string[] = [];
  const removedReasons: Partial<Record<ReviewReason, number>> = {};
  const sharpnessHistory: number[] = [];
  let sharpnessPeak = 0;
  for (let index = 0; index < reviewedCount; index += 1) {
    const descriptor = input.descriptors[index];
    const photo = input.photos[index];
    let imageElement: HTMLImageElement;
    try {
      imageElement = await decodeEnrollmentPhoto(photo);
    } catch {
      addReasonCounter(removedReasons, "decode_failed");
      continue;
    }
    const detection = await faceAPIService.detectFace(imageElement);
    if (!detection) {
      addReasonCounter(removedReasons, "no_face");
      continue;
    }
    const visibility = evaluateFaceVisibility(
      detection.box,
      detection.landmarks,
      imageElement,
      detection.score
    );
    if (visibility.blocked) {
      addReasonCounter(removedReasons, "occluded");
      continue;
    }
    const brightnessScore = estimateImageBrightness(imageElement);
    const diagnostics = buildCaptureDiagnostics({ brightnessScore, faceConfidence: detection.score });
    const blurThreshold = resolveBlurThreshold(diagnostics.lightLevel);
    const sharpnessScore = calculateFaceSharpness(imageElement, detection.box);
    if (sharpnessScore !== null) {
      sharpnessHistory.push(sharpnessScore);
      sharpnessPeak = Math.max(sharpnessPeak * 0.995, sharpnessScore);
      const sortedHistory = [...sharpnessHistory].sort((left, right) => left - right);
      const p30 = sortedHistory[Math.floor((sortedHistory.length - 1) * 0.3)] ?? 0;
      const p75 = sortedHistory[Math.floor((sortedHistory.length - 1) * 0.75)] ?? 0;
      const dynamicBase = Math.max(sharpnessPeak * 0.72, p75 * 0.64);
      const adaptiveFloor = Math.max(220, p30 * 0.55);
      const adaptiveThreshold =
        sharpnessPeak > 0
          ? Math.min(blurThreshold, Math.max(adaptiveFloor, dynamicBase))
          : Math.min(blurThreshold, 1200);
      const warmupBypass =
        keptDescriptors.length === 0 &&
        sharpnessHistory.length < 8 &&
        sharpnessScore >= 180;
      if (!warmupBypass && sharpnessScore < adaptiveThreshold) {
        addReasonCounter(removedReasons, "blurry");
        continue;
      }
    }
    if (keptDescriptors.length > 0) {
      const anchorDistance = euclideanDistance(keptDescriptors[0], descriptor);
      if (anchorDistance > ENROLL_SAME_PERSON_MAX_DISTANCE) {
        addReasonCounter(removedReasons, "mixed_identity");
        continue;
      }
    }
    keptDescriptors.push(descriptor);
    keptPhotos.push(photo);
  }
  const trimmedDescriptors = keptDescriptors.slice(0, ENROLL_CAPTURE_TARGET);
  const trimmedPhotos = keptPhotos.slice(0, ENROLL_CAPTURE_TARGET);
  const removedCount = reviewedCount - trimmedDescriptors.length;
  return {
    descriptors: trimmedDescriptors,
    photos: trimmedPhotos,
    reviewedCount,
    removedCount,
    removedReasons,
    primaryReason: resolvePrimaryReason(removedReasons),
  };
}

export async function runEnrollmentQualityGate(input: QualityGateInput): Promise<void> {
  if (input.captureBusy || input.descriptors.length < ENROLL_CAPTURE_TARGET) {
    return;
  }
  input.onStart("正在执行质量复检，请稍候...");
  try {
    const review = await reviewEnrollmentQuality({
      descriptors: input.descriptors,
      photos: input.photos,
    });
    if (review.descriptors.length < ENROLL_CAPTURE_TARGET) {
      input.onNeedRecapture({
        descriptors: review.descriptors,
        photos: review.photos,
        removedCount: review.removedCount,
        hint: `复检剔除 ${review.removedCount} 张异常帧（主要原因：${mapReviewReasonToHint(review.primaryReason)}），请补拍至 ${ENROLL_CAPTURE_TARGET} 张。`,
      });
      return;
    }
    input.onCompleted({
      descriptors: review.descriptors,
      photos: review.photos,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quality review failed.";
    input.onError(`质量复检失败：${message}`);
  } finally {
    input.onFinally();
  }
}
