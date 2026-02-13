import type { FaceBox, FacePoint } from "../../services/face";

type FaceImageSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

const MIN_REFERENCE_SKIN_RATIO = 0.12;
const MAX_LOWER_FACE_SKIN_RATIO = 0.07;
const MAX_LOWER_TO_UPPER_SKIN_RATIO = 0.5;
const MIN_EYE_LUMA_STDDEV = 16;
const MIN_EYE_STDDEV_SYMMETRY = 0.72;
const MAX_SINGLE_EYE_SKIN_RATIO = 0.58;
const MIN_EYE_SKIN_RATIO_DELTA = 0.18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSkinRatio(
  context: CanvasRenderingContext2D,
  region: { x: number; y: number; width: number; height: number }
): number | null {
  if (region.width < 8 || region.height < 8) {
    return null;
  }
  const data = context.getImageData(region.x, region.y, region.width, region.height).data;
  if (data.length === 0) {
    return null;
  }
  let skinPixels = 0;
  const totalPixels = data.length / 4;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const cb = 128 - 0.168736 * red - 0.331264 * green + 0.5 * blue;
    const cr = 128 + 0.5 * red - 0.418688 * green - 0.081312 * blue;
    const isSkin = luminance > 35 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
    if (isSkin) {
      skinPixels += 1;
    }
  }
  return skinPixels / Math.max(1, totalPixels);
}

function getLuminanceStdDev(
  context: CanvasRenderingContext2D,
  region: { x: number; y: number; width: number; height: number }
): number | null {
  if (region.width < 6 || region.height < 6) {
    return null;
  }
  const data = context.getImageData(region.x, region.y, region.width, region.height).data;
  if (data.length === 0) {
    return null;
  }
  const values: number[] = [];
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    values.push(0.299 * red + 0.587 * green + 0.114 * blue);
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function boundsFromPoints(points: FacePoint[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, maxX, maxY };
}

function makeExpandedRegion(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  expandX: number,
  expandY: number,
  sourceWidth: number,
  sourceHeight: number
): { x: number; y: number; width: number; height: number } {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const x = clamp(Math.round(bounds.minX - width * expandX), 0, sourceWidth - 1);
  const y = clamp(Math.round(bounds.minY - height * expandY), 0, sourceHeight - 1);
  const right = clamp(Math.round(bounds.maxX + width * expandX), x + 1, sourceWidth);
  const bottom = clamp(Math.round(bounds.maxY + height * expandY), y + 1, sourceHeight);
  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

function getSourceSize(source: FaceImageSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return {
      width: source.videoWidth || source.clientWidth || 0,
      height: source.videoHeight || source.clientHeight || 0,
    };
  }
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width || 0,
      height: source.naturalHeight || source.height || 0,
    };
  }
  return {
    width: source.width,
    height: source.height,
  };
}

export function evaluateLowerFaceOcclusion(source: FaceImageSource, box: FaceBox): string | null {
  const { width: sourceWidth, height: sourceHeight } = getSourceSize(source);
  if (!sourceWidth || !sourceHeight) {
    return null;
  }
  const faceX = clamp(Math.round(box.x), 0, sourceWidth - 1);
  const faceY = clamp(Math.round(box.y), 0, sourceHeight - 1);
  const faceWidth = clamp(Math.round(box.width), 1, sourceWidth - faceX);
  const faceHeight = clamp(Math.round(box.height), 1, sourceHeight - faceY);
  if (faceWidth < 40 || faceHeight < 40) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.drawImage(source, 0, 0, sourceWidth, sourceHeight);
  const sampleX = faceX + Math.round(faceWidth * 0.2);
  const sampleWidth = Math.max(8, Math.round(faceWidth * 0.6));
  const upperRegion = {
    x: clamp(sampleX, 0, sourceWidth - 8),
    y: clamp(faceY + Math.round(faceHeight * 0.24), 0, sourceHeight - 8),
    width: clamp(sampleWidth, 8, sourceWidth - sampleX),
    height: clamp(Math.round(faceHeight * 0.2), 8, sourceHeight - faceY),
  };
  const lowerRegion = {
    x: upperRegion.x,
    y: clamp(faceY + Math.round(faceHeight * 0.56), 0, sourceHeight - 8),
    width: upperRegion.width,
    height: clamp(Math.round(faceHeight * 0.32), 8, sourceHeight - faceY),
  };
  const upperSkinRatio = getSkinRatio(context, upperRegion);
  const lowerSkinRatio = getSkinRatio(context, lowerRegion);
  if (upperSkinRatio === null || lowerSkinRatio === null) {
    return null;
  }
  if (upperSkinRatio < MIN_REFERENCE_SKIN_RATIO) {
    return null;
  }
  const lowerToUpper = lowerSkinRatio / Math.max(0.001, upperSkinRatio);
  const likelyMask =
    lowerSkinRatio < MAX_LOWER_FACE_SKIN_RATIO && lowerToUpper < MAX_LOWER_TO_UPPER_SKIN_RATIO;
  if (!likelyMask) {
    return null;
  }
  return `mask(upper:${upperSkinRatio.toFixed(2)},lower:${lowerSkinRatio.toFixed(2)})`;
}

export function evaluateEyeOcclusion(
  source: FaceImageSource,
  landmarks: FacePoint[]
): { blocked: boolean; reason: string | null } {
  const { width: sourceWidth, height: sourceHeight } = getSourceSize(source);
  if (!sourceWidth || !sourceHeight) {
    return { blocked: false, reason: null };
  }
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return { blocked: false, reason: null };
  }
  context.drawImage(source, 0, 0, sourceWidth, sourceHeight);
  const leftEyeBounds = boundsFromPoints(landmarks.slice(36, 42));
  const rightEyeBounds = boundsFromPoints(landmarks.slice(42, 48));
  const leftRegion = makeExpandedRegion(leftEyeBounds, 0.45, 0.7, sourceWidth, sourceHeight);
  const rightRegion = makeExpandedRegion(rightEyeBounds, 0.45, 0.7, sourceWidth, sourceHeight);
  const leftStd = getLuminanceStdDev(context, leftRegion);
  const rightStd = getLuminanceStdDev(context, rightRegion);
  const leftSkinRatio = getSkinRatio(context, leftRegion);
  const rightSkinRatio = getSkinRatio(context, rightRegion);
  if (leftStd === null || rightStd === null || leftSkinRatio === null || rightSkinRatio === null) {
    return { blocked: false, reason: null };
  }
  const minStd = Math.min(leftStd, rightStd);
  const maxStd = Math.max(leftStd, rightStd);
  const symmetry = minStd / Math.max(0.001, maxStd);
  const maxSkinRatio = Math.max(leftSkinRatio, rightSkinRatio);
  const skinDelta = Math.abs(leftSkinRatio - rightSkinRatio);
  const blockedByTexture = minStd < MIN_EYE_LUMA_STDDEV && symmetry < MIN_EYE_STDDEV_SYMMETRY;
  const blockedBySkin =
    maxSkinRatio > MAX_SINGLE_EYE_SKIN_RATIO && skinDelta > MIN_EYE_SKIN_RATIO_DELTA;
  const blocked = blockedByTexture || blockedBySkin;
  if (!blocked) {
    return { blocked: false, reason: null };
  }
  return {
    blocked: true,
    reason: `eye_occlusion(std:${minStd.toFixed(1)},sym:${symmetry.toFixed(2)},skin:${maxSkinRatio.toFixed(2)},delta:${skinDelta.toFixed(2)})`,
  };
}
