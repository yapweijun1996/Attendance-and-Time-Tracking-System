import { loadPolicyConfig } from "../../services/policy-config";

const DEFAULT_VERIFICATION_THRESHOLD = 0.6;

let cachedThreshold: number | null = null;

function isValidThreshold(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1;
}

export async function loadVerificationThreshold(): Promise<number> {
  if (cachedThreshold !== null) {
    return cachedThreshold;
  }

  try {
    const policy = await loadPolicyConfig();
    const threshold = policy?.verification?.threshold;
    if (isValidThreshold(threshold)) {
      cachedThreshold = threshold;
      return threshold;
    }
  } catch {
    // Fallback to default threshold when policy doc is not ready.
  }

  cachedThreshold = DEFAULT_VERIFICATION_THRESHOLD;
  return cachedThreshold;
}

export function resetPolicyCache(): void {
  cachedThreshold = null;
}
