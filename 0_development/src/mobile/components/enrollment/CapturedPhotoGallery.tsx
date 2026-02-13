import { useCallback, useEffect, useMemo, useState } from "react";

interface CapturedPhotoGalleryProps {
  photos: string[];
  mode?: "card" | "strip";
  onPreviewOpenChange?: (open: boolean) => void;
}

function toDataUrl(photo: string): string {
  if (photo.startsWith("data:")) {
    return photo;
  }
  return `data:image/jpeg;base64,${photo}`;
}

export default function CapturedPhotoGallery({
  photos,
  mode = "card",
  onPreviewOpenChange,
}: CapturedPhotoGalleryProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [stripExpanded, setStripExpanded] = useState(false);
  const photoUrls = useMemo(() => photos.map((photo) => toDataUrl(photo)), [photos]);
  const hasValidPreviewIndex = previewIndex !== null && previewIndex >= 0 && previewIndex < photoUrls.length;
  const previewUrl = hasValidPreviewIndex ? photoUrls[previewIndex] : null;
  const canPreviewPrev = hasValidPreviewIndex && previewIndex > 0;
  const canPreviewNext = hasValidPreviewIndex && previewIndex < photoUrls.length - 1;

  const openPrevPreview = useCallback(() => {
    setPreviewIndex((current) => {
      if (current === null) {
        return null;
      }
      return Math.max(0, current - 1);
    });
  }, []);

  const openNextPreview = useCallback(() => {
    setPreviewIndex((current) => {
      if (current === null) {
        return null;
      }
      return Math.min(photoUrls.length - 1, current + 1);
    });
  }, [photoUrls.length]);

  useEffect(() => {
    if (previewIndex === null) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewIndex(null);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        openPrevPreview();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        openNextPreview();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openNextPreview, openPrevPreview, previewIndex]);

  useEffect(() => {
    onPreviewOpenChange?.(previewUrl !== null);
  }, [onPreviewOpenChange, previewUrl]);

  return (
    <>
      {mode === "strip" ? (
        <section className="rounded-xl border border-white/20 bg-black/40 p-2 backdrop-blur-md">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-white/80">Captured Photos</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-white/70">{photoUrls.length} saved</span>
              <button
                type="button"
                onClick={() =>
                  setStripExpanded((current) => {
                    const next = !current;
                    if (!next) {
                      setPreviewIndex(null);
                    }
                    return next;
                  })
                }
                className="rounded-md border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white"
              >
                {stripExpanded ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {!stripExpanded ? (
            <p className="text-[11px] text-white/65">Hidden by default. Tap Show to expand photos.</p>
          ) : photoUrls.length === 0 ? (
            <p className="text-[11px] text-white/70">No captured photo yet. Auto capture will fill this strip.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photoUrls.map((photoUrl, index) => {
                const isLatest = index === photoUrls.length - 1;
                return (
                  <button
                    key={`${index}-${photoUrl.slice(0, 24)}`}
                    type="button"
                    onClick={() => setPreviewIndex(index)}
                    className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border bg-slate-100 ${isLatest ? "border-emerald-400 ring-2 ring-emerald-300/60" : "border-slate-300"}`}
                    aria-label={`Preview captured photo ${index + 1}`}
                  >
                    <img src={photoUrl} alt={`Captured ${index + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-white">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="ui-card mt-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="ui-kicker mb-0">Captured Photos</h2>
            <span className="ui-note-xs">{photoUrls.length} saved</span>
          </div>

          {photoUrls.length === 0 ? (
            <p className="ui-note-xs">No captured photo yet. Auto capture will fill this grid.</p>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
              {photoUrls.map((photoUrl, index) => {
                const isLatest = index === photoUrls.length - 1;
                return (
                  <button
                    key={`${index}-${photoUrl.slice(0, 24)}`}
                    type="button"
                    onClick={() => setPreviewIndex(index)}
                    className={`relative aspect-square overflow-hidden rounded-lg border bg-slate-100 ${isLatest ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200"}`}
                    aria-label={`Preview captured photo ${index + 1}`}
                  >
                    <img src={photoUrl} alt={`Captured ${index + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute right-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {previewUrl ? (
        <div
          className="fixed inset-0 z-[90] bg-black/92"
          onClick={() => setPreviewIndex(null)}
          role="presentation"
        >
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="rounded-xl border border-white/20 bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
              {hasValidPreviewIndex ? previewIndex + 1 : 0}/{photoUrls.length}
            </p>
            <button
              type="button"
              onClick={() => setPreviewIndex(null)}
              className="rounded-xl border border-white/25 bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md"
            >
              Close
            </button>
          </div>
          <div
            className="flex h-full w-full items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <img
              src={previewUrl}
              alt={`Preview ${hasValidPreviewIndex ? previewIndex + 1 : 0}`}
              className="max-h-full max-w-full rounded-lg bg-slate-950 object-contain"
            />
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openPrevPreview();
              }}
              disabled={!canPreviewPrev}
              className="pointer-events-auto rounded-full border border-white/25 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openNextPreview();
              }}
              disabled={!canPreviewNext}
              className="pointer-events-auto rounded-full border border-white/25 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
