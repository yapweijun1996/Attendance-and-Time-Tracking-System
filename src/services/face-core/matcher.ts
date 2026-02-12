import type { FaceProfile, MatchFaceResult } from "./types";

export function toFloat32Array(input: Float32Array | number[]): Float32Array {
  return input instanceof Float32Array ? input : new Float32Array(input);
}

export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error("Descriptor length mismatch.");
  }

  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function normalizeProfiles(profiles: FaceProfile[]): FaceProfile[] {
  return profiles.map((profile) => ({
    ...profile,
    descriptors: profile.descriptors.map((descriptor) => toFloat32Array(descriptor)),
    meanDescriptor: profile.meanDescriptor ? toFloat32Array(profile.meanDescriptor) : undefined,
  }));
}

export function matchFaceDescriptor(
  profiles: FaceProfile[],
  descriptor: Float32Array | number[],
  threshold: number
): MatchFaceResult {
  if (profiles.length === 0) {
    return {
      matched: false,
      userId: null,
      name: null,
      distance: Number.POSITIVE_INFINITY,
      threshold,
    };
  }

  const query = toFloat32Array(descriptor);
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestProfile: FaceProfile | null = null;

  for (const profile of profiles) {
    const candidates = profile.meanDescriptor ? [profile.meanDescriptor] : profile.descriptors;
    for (const candidate of candidates) {
      const distance = euclideanDistance(query, toFloat32Array(candidate));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestProfile = profile;
      }
    }
  }

  const matched = bestDistance < threshold;
  return {
    matched,
    userId: matched && bestProfile ? bestProfile.id : null,
    name: matched && bestProfile ? bestProfile.name ?? bestProfile.id : null,
    distance: bestDistance,
    threshold,
  };
}
