import { useCallback } from "react";
import { runEnrollmentQualityGate } from "../services/enrollment-quality-review";
import type { CaptureFlowState } from "../services/enrollment-capture";

interface UseEnrollmentQualityContinueInput {
  captureBusy: boolean;
  descriptors: number[][];
  photos: string[];
  persistDraft: (descriptors: number[][], photos: string[]) => void;
  onCompleted: (payload: { descriptors: number[][]; photos: string[] }) => void;
  setCaptureBusy: (value: boolean) => void;
  setCaptureState: (value: CaptureFlowState) => void;
  setCaptureHint: (value: string) => void;
  setDescriptors: (value: number[][]) => void;
  setPhotos: (value: string[]) => void;
}

export function useEnrollmentQualityContinue({
  captureBusy,
  descriptors,
  photos,
  persistDraft,
  onCompleted,
  setCaptureBusy,
  setCaptureState,
  setCaptureHint,
  setDescriptors,
  setPhotos,
}: UseEnrollmentQualityContinueInput): () => Promise<void> {
  return useCallback(async () => {
    await runEnrollmentQualityGate({
      descriptors,
      photos,
      captureBusy,
      onStart: (hint) => {
        setCaptureBusy(true);
        setCaptureState("SCANNING");
        setCaptureHint(hint);
      },
      onNeedRecapture: ({ descriptors: nextDescriptors, photos: nextPhotos, hint }) => {
        setDescriptors(nextDescriptors);
        setPhotos(nextPhotos);
        persistDraft(nextDescriptors, nextPhotos);
        setCaptureState("LOW_CONFIDENCE");
        setCaptureHint(hint);
      },
      onCompleted: ({ descriptors: nextDescriptors, photos: nextPhotos }) => {
        persistDraft(nextDescriptors, nextPhotos);
        onCompleted({ descriptors: nextDescriptors, photos: nextPhotos });
      },
      onError: (message) => {
        setCaptureState("LOW_CONFIDENCE");
        setCaptureHint(message);
      },
      onFinally: () => setCaptureBusy(false),
    });
  }, [
    captureBusy,
    descriptors,
    onCompleted,
    persistDraft,
    photos,
    setCaptureBusy,
    setCaptureHint,
    setCaptureState,
    setDescriptors,
    setPhotos,
  ]);
}
