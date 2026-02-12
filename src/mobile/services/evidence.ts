export interface EvidencePolicy {
  maxWidth: number;
  jpegQuality: number;
  minJpegQuality: number;
  maxBytes: number;
}

export interface EvidenceWatermarkMeta {
  clientTs: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  officeName: string;
  deviceId: string;
}

export interface EvidenceAttachment {
  content_type: string;
  data: string;
}

export interface EvidenceResult {
  attachment: EvidenceAttachment;
  bytes: number;
  quality: number;
  width: number;
  height: number;
}

export const defaultEvidencePolicy: EvidencePolicy = {
  maxWidth: 640,
  jpegQuality: 0.8,
  minJpegQuality: 0.5,
  maxBytes: 200 * 1024,
};

function clampQuality(value: number): number {
  if (!Number.isFinite(value)) {
    return defaultEvidencePolicy.jpegQuality;
  }
  return Math.min(0.95, Math.max(0.4, value));
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode evidence image."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to convert evidence to base64."));
        return;
      }
      const [, base64] = result.split(",");
      if (!base64) {
        reject(new Error("Invalid evidence base64 payload."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Unable to read evidence image."));
    reader.readAsDataURL(blob);
  });
}

function buildWatermarkLines(meta: EvidenceWatermarkMeta): string[] {
  const gps =
    meta.lat !== null && meta.lng !== null
      ? `GPS ${meta.lat.toFixed(5)},${meta.lng.toFixed(5)} ±${Math.round(meta.accuracyM ?? 0)}m`
      : "GPS unavailable";

  return [
    `TS ${meta.clientTs}`,
    gps,
    `Office ${meta.officeName}`,
    `Device ${meta.deviceId}`,
  ];
}

function drawWatermark(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  meta: EvidenceWatermarkMeta
): void {
  const lines = buildWatermarkLines(meta);
  const fontSize = Math.max(10, Math.round(canvas.width / 52));
  const lineHeight = Math.round(fontSize * 1.3);
  const padding = 8;
  const margin = 8;

  context.save();
  context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.textBaseline = "top";

  const maxLineWidth = lines.reduce((width, line) => {
    const measured = context.measureText(line).width;
    return Math.max(width, measured);
  }, 0);

  const boxWidth = Math.ceil(maxLineWidth + padding * 2);
  const boxHeight = Math.ceil(lines.length * lineHeight + padding * 2);
  const x = Math.max(margin, canvas.width - boxWidth - margin);
  const y = margin;

  context.fillStyle = "rgba(15, 23, 42, 0.72)";
  context.fillRect(x, y, boxWidth, boxHeight);
  context.fillStyle = "rgba(248, 250, 252, 0.96)";

  lines.forEach((line, index) => {
    context.fillText(line, x + padding, y + padding + lineHeight * index);
  });

  context.restore();
}

function createCanvasFromVideo(videoElement: HTMLVideoElement, maxWidth: number): HTMLCanvasElement {
  if (videoElement.videoWidth <= 0 || videoElement.videoHeight <= 0) {
    throw new Error("Video stream is not ready for evidence capture.");
  }

  const sourceWidth = videoElement.videoWidth;
  const sourceHeight = videoElement.videoHeight;
  const scale = maxWidth > 0 ? Math.min(1, maxWidth / sourceWidth) : 1;
  const width = Math.max(160, Math.round(sourceWidth * scale));
  const height = Math.max(120, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is unavailable for evidence capture.");
  }

  context.drawImage(videoElement, 0, 0, width, height);
  return canvas;
}

async function encodeWithPolicy(
  canvas: HTMLCanvasElement,
  policy: EvidencePolicy
): Promise<{ blob: Blob; quality: number }> {
  const minQuality = clampQuality(policy.minJpegQuality);
  let quality = clampQuality(policy.jpegQuality);
  let blob = await toBlob(canvas, quality);

  while (blob.size > policy.maxBytes && quality > minQuality) {
    quality = Math.max(minQuality, Number((quality - 0.1).toFixed(2)));
    blob = await toBlob(canvas, quality);
  }

  return { blob, quality };
}

export async function captureEvidenceAttachment(
  videoElement: HTMLVideoElement,
  meta: EvidenceWatermarkMeta,
  policy: EvidencePolicy = defaultEvidencePolicy
): Promise<EvidenceResult> {
  let widthTarget = policy.maxWidth;
  let bestBlob: Blob | null = null;
  let bestQuality = clampQuality(policy.jpegQuality);
  let bestCanvas: HTMLCanvasElement | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const canvas = createCanvasFromVideo(videoElement, widthTarget);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is unavailable for evidence watermark.");
    }

    drawWatermark(canvas, context, meta);
    const encoded = await encodeWithPolicy(canvas, policy);

    bestBlob = encoded.blob;
    bestQuality = encoded.quality;
    bestCanvas = canvas;
    if (encoded.blob.size <= policy.maxBytes || widthTarget <= 240) {
      break;
    }
    widthTarget = Math.max(240, Math.round(widthTarget * 0.85));
  }

  if (!bestBlob || !bestCanvas) {
    throw new Error("Evidence capture failed unexpectedly.");
  }

  const base64 = await toBase64(bestBlob);
  return {
    attachment: {
      content_type: "image/jpeg",
      data: base64,
    },
    bytes: bestBlob.size,
    quality: bestQuality,
    width: bestCanvas.width,
    height: bestCanvas.height,
  };
}
