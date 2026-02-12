import { useEffect, useRef } from "react";

import type { FaceBox, FacePoint } from "../../../services/face";

interface FaceGuideOverlayProps {
  videoElement: HTMLVideoElement | null;
  box: FaceBox | null;
  landmarks: FacePoint[];
}

const LANDMARK_SEGMENTS: Array<{ indexes: number[]; closePath?: boolean }> = [
  { indexes: Array.from({ length: 17 }, (_, index) => index) },
  { indexes: [17, 18, 19, 20, 21] },
  { indexes: [22, 23, 24, 25, 26] },
  { indexes: [27, 28, 29, 30] },
  { indexes: [31, 32, 33, 34, 35] },
  { indexes: [36, 37, 38, 39, 40, 41], closePath: true },
  { indexes: [42, 43, 44, 45, 46, 47], closePath: true },
  { indexes: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59], closePath: true },
  { indexes: [60, 61, 62, 63, 64, 65, 66, 67], closePath: true },
];

function mapToRenderedFrame({
  valueX,
  valueY,
  sourceWidth,
  sourceHeight,
  renderWidth,
  renderHeight,
}: {
  valueX: number;
  valueY: number;
  sourceWidth: number;
  sourceHeight: number;
  renderWidth: number;
  renderHeight: number;
}) {
  const scale = Math.max(renderWidth / sourceWidth, renderHeight / sourceHeight);
  const drawnWidth = sourceWidth * scale;
  const drawnHeight = sourceHeight * scale;
  const offsetX = (renderWidth - drawnWidth) / 2;
  const offsetY = (renderHeight - drawnHeight) / 2;
  return {
    x: valueX * scale + offsetX,
    y: valueY * scale + offsetY,
    scale,
  };
}

export default function FaceGuideOverlay({ videoElement, box, landmarks }: FaceGuideOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const renderWidth = canvas.clientWidth;
    const renderHeight = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(renderWidth * dpr);
    canvas.height = Math.floor(renderHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, renderWidth, renderHeight);

    if (!videoElement || !box) {
      return;
    }
    const sourceWidth = videoElement.videoWidth;
    const sourceHeight = videoElement.videoHeight;
    if (!sourceWidth || !sourceHeight) {
      return;
    }

    const topLeft = mapToRenderedFrame({
      valueX: box.x,
      valueY: box.y,
      sourceWidth,
      sourceHeight,
      renderWidth,
      renderHeight,
    });
    const mapped = mapToRenderedFrame({
      valueX: box.x + box.width,
      valueY: box.y + box.height,
      sourceWidth,
      sourceHeight,
      renderWidth,
      renderHeight,
    });
    const boxWidth = mapped.x - topLeft.x;
    const boxHeight = mapped.y - topLeft.y;
    const faceCenterX = topLeft.x + boxWidth / 2;
    const faceCenterY = topLeft.y + boxHeight / 2;

    context.strokeStyle = "rgba(16, 185, 129, 0.95)";
    context.lineWidth = 2.4;
    context.shadowBlur = 14;
    context.shadowColor = "rgba(16, 185, 129, 0.6)";
    context.beginPath();
    context.ellipse(
      faceCenterX,
      faceCenterY,
      Math.max(8, boxWidth / 2),
      Math.max(10, boxHeight / 2),
      0,
      0,
      Math.PI * 2
    );
    context.stroke();
    context.shadowBlur = 0;

    const mappedLandmarks = landmarks.map((point) =>
      mapToRenderedFrame({
        valueX: point.x,
        valueY: point.y,
        sourceWidth,
        sourceHeight,
        renderWidth,
        renderHeight,
      })
    );

    // Draw landmark contour groups to make facial structure visible like sample logic.
    context.strokeStyle = "rgba(125, 211, 252, 0.85)";
    context.lineWidth = 1.1;
    for (const segment of LANDMARK_SEGMENTS) {
      const firstPoint = mappedLandmarks[segment.indexes[0]];
      if (!firstPoint) {
        continue;
      }
      context.beginPath();
      context.moveTo(firstPoint.x, firstPoint.y);
      for (let index = 1; index < segment.indexes.length; index += 1) {
        const point = mappedLandmarks[segment.indexes[index]];
        if (!point) {
          continue;
        }
        context.lineTo(point.x, point.y);
      }
      if (segment.closePath) {
        context.closePath();
      }
      context.stroke();
    }

    context.fillStyle = "rgba(16, 185, 129, 0.95)";
    for (const mappedPoint of mappedLandmarks) {
      context.beginPath();
      context.arc(mappedPoint.x, mappedPoint.y, 1.5, 0, Math.PI * 2);
      context.fill();
    }
  }, [box, landmarks, videoElement]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10 h-full w-full" />;
}
