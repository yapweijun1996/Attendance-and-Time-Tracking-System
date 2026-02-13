const ENROLLMENT_DRAFT_STORAGE_KEY = "satts.mobile.enrollment.draft";

export interface EnrollmentDraft {
  consentAcceptedAt: string | null;
  descriptors: number[][];
  photos: string[];
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createEmptyDraft(): EnrollmentDraft {
  return {
    consentAcceptedAt: null,
    descriptors: [],
    photos: [],
  };
}

function normalizeDescriptors(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((descriptor) => {
      if (!Array.isArray(descriptor)) {
        return [];
      }
      return descriptor
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry));
    })
    .filter((descriptor) => descriptor.length > 0);
}

function normalizePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((photo) => (typeof photo === "string" ? photo.trim() : ""))
    .filter((photo) => photo.length > 0);
}

function normalizeDraft(value: unknown): EnrollmentDraft {
  if (value === null || typeof value !== "object") {
    return createEmptyDraft();
  }
  const candidate = value as Partial<EnrollmentDraft>;
  return {
    consentAcceptedAt:
      typeof candidate.consentAcceptedAt === "string" && candidate.consentAcceptedAt.trim().length > 0
        ? candidate.consentAcceptedAt
        : null,
    descriptors: normalizeDescriptors(candidate.descriptors),
    photos: normalizePhotos(candidate.photos),
  };
}

export function readEnrollmentDraft(): EnrollmentDraft {
  if (!canUseStorage()) {
    return createEmptyDraft();
  }
  const raw = window.localStorage.getItem(ENROLLMENT_DRAFT_STORAGE_KEY);
  if (!raw) {
    return createEmptyDraft();
  }
  try {
    return normalizeDraft(JSON.parse(raw));
  } catch {
    return createEmptyDraft();
  }
}

export function saveEnrollmentDraft(draft: EnrollmentDraft): void {
  if (!canUseStorage()) {
    return;
  }
  const normalized = normalizeDraft(draft);
  window.localStorage.setItem(ENROLLMENT_DRAFT_STORAGE_KEY, JSON.stringify(normalized));
}

export function clearEnrollmentDraft(): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(ENROLLMENT_DRAFT_STORAGE_KEY);
}
