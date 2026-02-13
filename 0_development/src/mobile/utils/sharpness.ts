import type { FaceBox } from "../../services/face";

type FaceFrameSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSourceSize(source: FaceFrameSource): { width: number; height: number } {
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

function buildFaceCanvas(
  source: FaceFrameSource,
  faceBox: FaceBox,
  paddingRatio = 0.14,
  maxEdge = 160
): HTMLCanvasElement | null {
  const { width: sourceWidth, height: sourceHeight } = getSourceSize(source);
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
    source,
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
  const smoothed = new Float32Array(gray.length);
  // Light denoise pass (3x3 mean blur) to suppress ISO noise spikes from front cameras.
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      const centerIndex = row + x;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        smoothed[centerIndex] = gray[centerIndex];
        continue;
      }
      let sumNeighbors = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const sampleRow = (y + offsetY) * width;
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          sumNeighbors += gray[sampleRow + x + offsetX];
        }
      }
      smoothed[centerIndex] = sumNeighbors / 9;
    }
  }

  let sum = 0;
  let sumSquares = 0;
  let samples = 0;

  // Use a tighter center ROI (55%) to avoid face-edge/background high-frequency contamination.
  const roiStartX = Math.max(1, Math.floor(width * 0.225));
  const roiEndX = Math.min(width - 1, Math.ceil(width * 0.775));
  const roiStartY = Math.max(1, Math.floor(height * 0.225));
  const roiEndY = Math.min(height - 1, Math.ceil(height * 0.775));

  // Laplacian kernel: neighbors - center*8, using variance as sharpness score.
  for (let y = roiStartY; y < roiEndY; y += 1) {
    const row = y * width;
    for (let x = roiStartX; x < roiEndX; x += 1) {
      const centerIndex = row + x;
      const laplacian =
        smoothed[centerIndex - width - 1] +
        smoothed[centerIndex - width] +
        smoothed[centerIndex - width + 1] +
        smoothed[centerIndex - 1] -
        8 * smoothed[centerIndex] +
        smoothed[centerIndex + 1] +
        smoothed[centerIndex + width - 1] +
        smoothed[centerIndex + width] +
        smoothed[centerIndex + width + 1];
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
  source: FaceFrameSource,
  faceBox: FaceBox
): number | null {
  const faceCanvas = buildFaceCanvas(source, faceBox);
  if (!faceCanvas) {
    return null;
  }
  return calculateSharpness(faceCanvas);
}
