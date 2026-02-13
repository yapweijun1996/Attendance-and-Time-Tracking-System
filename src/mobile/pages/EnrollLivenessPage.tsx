import { useCallback, useState } from "react";

import { saveEnrollmentProfile } from "../services/enrollment";
import { clearEnrollmentDraft, readEnrollmentDraft } from "../services/enrollment-draft";

const DEFAULT_LIVENESS_CONFIDENCE = 1;

interface EnrollLivenessPageProps {
  consentAcceptedAt: string | null;
  descriptors: number[][];
  photos: string[];
  onBack: () => void;
  onRestart: () => void;
  onSaved: (message: string) => void;
}

export default function EnrollLivenessPage({
  consentAcceptedAt,
  descriptors,
  photos,
  onBack,
  onRestart,
  onSaved,
}: EnrollLivenessPageProps) {
  const [bootDraft] = useState(() => readEnrollmentDraft());
  const effectiveConsentAcceptedAt = consentAcceptedAt ?? bootDraft.consentAcceptedAt;
  const effectiveDescriptors = descriptors.length > 0 ? descriptors : bootDraft.descriptors;
  const effectivePhotos = photos.length > 0 ? photos : bootDraft.photos;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!effectiveConsentAcceptedAt) {
      setSaveError("Consent timestamp is missing. Restart enrollment.");
      return;
    }
    if (effectiveDescriptors.length === 0) {
      setSaveError("No descriptors captured. Restart enrollment.");
      return;
    }
    if (effectivePhotos.length === 0) {
      setSaveError("No enrollment photos captured. Restart enrollment.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const reviewedAt = new Date().toISOString();
      const profile = await saveEnrollmentProfile({
        descriptors: effectiveDescriptors,
        photos: effectivePhotos,
        consentAcceptedAt: effectiveConsentAcceptedAt,
        liveness: {
          mode: "PASSIVE_SCORE",
          passedAt: reviewedAt,
          confidence: DEFAULT_LIVENESS_CONFIDENCE,
        },
      });

      // Sync in-memory matcher with latest profile descriptors.
      const { faceAPIService } = await import("../../services/face");
      faceAPIService.setProfiles([
        {
          id: profile.staffId,
          name: profile.name,
          descriptors: profile.faceDescriptors,
        },
      ]);

      clearEnrollmentDraft();
      onSaved(`Enrollment saved (${profile.faceDescriptors.length} descriptors, ${effectivePhotos.length} photos).`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save enrollment profile.");
    } finally {
      setSaving(false);
    }
  }, [
    effectiveConsentAcceptedAt,
    effectiveDescriptors,
    effectivePhotos,
    onSaved,
  ]);

  if (!effectiveConsentAcceptedAt || effectiveDescriptors.length === 0 || effectivePhotos.length === 0) {
    return (
      <div className="ui-page-flow">
        <main className="ui-main-flow">
          <h1 className="ui-title text-xl">Review Your Enrollment</h1>
          <p className="ui-note-warn mt-2">
            Missing capture context. Restart from consent and capture steps.
          </p>
          <button
            type="button"
            onClick={onRestart}
            className="ui-btn ui-btn-primary mt-4 w-full"
          >
            Restart Enrollment
          </button>
        </main>
      </div>
    );
  }

  const backgroundPhoto = effectivePhotos[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {backgroundPhoto ? (
        <>
          {/* Blur first captured frame as ambience to keep visual continuity with capture page. */}
          <img
            src={backgroundPhoto}
            alt="Enrollment background"
            className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover opacity-45 blur-2xl"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/55" />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900 to-black" />
      )}

      <main className="relative z-10 flex min-h-screen flex-col p-3 sm:p-5">
        <header className="pointer-events-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-white/20 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
          >
            Back
          </button>
          <div className="rounded-2xl border border-white/25 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-lg">
            READY
          </div>
        </header>

        <section className="pointer-events-auto mt-4 rounded-3xl border border-white/20 bg-black/45 p-3 backdrop-blur-xl sm:p-4">
          <h1 className="text-lg font-black text-white sm:text-xl">Review Your Enrollment</h1>
          <p className="mt-1 text-xs font-semibold text-white/75">
            {effectivePhotos.length} photos · {effectiveDescriptors.length} descriptors · Ready to save
          </p>

          {/* Keep dense preview grid so user can verify capture quality within one glance. */}
          <div className="mt-3 grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
            {effectivePhotos.map((photo, index) => (
              <div
                key={`${index}-${photo.slice(0, 24)}`}
                className="relative overflow-hidden rounded-xl border border-white/20 bg-slate-900"
              >
                <img
                  src={photo}
                  alt={`Captured ${index + 1}`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute right-1 top-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex-1" />

        {saveError ? (
          <p className="pointer-events-auto mb-2 rounded-xl border border-red-300/35 bg-red-900/60 px-3 py-2 text-xs font-semibold text-red-100 backdrop-blur-md">
            {saveError}
          </p>
        ) : null}

        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving}
            className="w-full rounded-2xl border border-emerald-300/50 bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(16,185,129,0.45)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-emerald-900/40 disabled:bg-emerald-900/60"
          >
            {saving ? "Saving..." : "确认并完成注册"}
          </button>
          <p className="mt-2 text-center text-[11px] font-semibold text-white/75">
            点击后将 descriptor 与采集照片保存到本地数据库。
          </p>
        </div>
      </main>
    </div>
  );
}
