import type { FaceBox } from "../../services/face";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildFaceCanvas(
  videoElement: HTMLVideoElement,
  faceBox: FaceBox,
  paddingRatio = 0.14,
  maxEdge = 160
): HTMLCanvasElement | null {
  const sourceWidth = videoElement.videoWidth;
  const sourceHeight = videoElement.videoHeight;
  if (!sourceWidth || !sourceHeight) {
    return null;
  }

  const padX = faceBox.width * paddingRatio;
  const padY = faceBox.height * paddingRatio;
  const cropX = clamp(faceBox.x - padX, 0, sourceWidth);
  const cropY = clamp(faceBox.y - padY, 0, sourceHeight);
  const cropRight = clamp(faceBox.x + faceBox.width + padX, 0, sourceWidth);
  const cropBottom = clamp(faceBox.y + faceBox.height + padY, 0, sourceHeight);
  const cropWidth = Math.max(1, cropRight - cropX);
  const cropHeight = Math.max(1, cropBottom - cropY);

  const scale = Math.min(1, maxEdge / Math.max(cropWidth, cropHeight));
  const targetWidth = Math.max(1, Math.round(cropWidth * scale));
  const targetHeight = Math.max(1, Math.round(cropHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  // Draw only face crop to minimize CPU usage.
  context.drawImage(
    videoElement,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    targetWidth,
    targetHeight
  );
  return canvas;
}

export function calculateSharpness(canvas: HTMLCanvasElement): number {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return 0;
  }

  const width = canvas.width;
  const height = canvas.height;
  if (width < 3 || height < 3) {
    return 0;
  }

  const pixels = context.getImageData(0, 0, width, height).data;
  const gray = new Float32Array(width * height);
  for (let index = 0, pixel = 0; index < pixels.length; index += 4, pixel += 1) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    gray[pixel] = 0.299 * red + 0.587 * green + 0.114 * blue;
  }

  let sum = 0;
  let sumSquares = 0;
  let samples = 0;

  // Use central ROI to reduce background-edge noise that can falsely inflate sharpness.
  const roiStartX = Math.max(1, Math.floor(width * 0.12));
  const roiEndX = Math.min(width - 1, Math.ceil(width * 0.88));
  const roiStartY = Math.max(1, Math.floor(height * 0.12));
  const roiEndY = Math.min(height - 1, Math.ceil(height * 0.88));

  // Laplacian kernel: neighbors - center*8, using variance as sharpness score.
  for (let y = roiStartY; y < roiEndY; y += 1) {
    const row = y * width;
    for (let x = roiStartX; x < roiEndX; x += 1) {
      const centerIndex = row + x;
      const laplacian =
        gray[centerIndex - width - 1] +
        gray[centerIndex - width] +
        gray[centerIndex - width + 1] +
        gray[centerIndex - 1] -
        8 * gray[centerIndex] +
        gray[centerIndex + 1] +
        gray[centerIndex + width - 1] +
        gray[centerIndex + width] +
        gray[centerIndex + width + 1];
      sum += laplacian;
      sumSquares += laplacian * laplacian;
      samples += 1;
    }
  }

  if (samples === 0) {
    return 0;
  }

  const mean = sum / samples;
  const variance = sumSquares / samples - mean * mean;
  // Keep raw Laplacian variance so threshold tuning (e.g. ~20) stays meaningful.
  return Math.max(0, variance);
}

export function calculateFaceSharpness(
  videoElement: HTMLVideoElement,
  faceBox: FaceBox
): number | null {
  const faceCanvas = buildFaceCanvas(videoElement, faceBox);
  if (!faceCanvas) {
    return null;
  }
  return calculateSharpness(faceCanvas);
}
