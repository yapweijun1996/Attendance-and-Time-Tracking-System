import type { PolicyConfig } from "../types/policy";

const DEFAULT_ORG_ID = "org_01";
const DEFAULT_POLICY_DOC_ID = `policy::${DEFAULT_ORG_ID}`;
type PolicyDoc = PolicyConfig & Record<string, unknown>;

function isNotFoundError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as { status?: number; name?: string };
  return candidate.status === 404 || candidate.name === "not_found";
}

export function createDefaultPolicyConfig(): PolicyConfig {
  return {
    _id: DEFAULT_POLICY_DOC_ID,
    type: "POLICY_CONFIG",
    orgId: DEFAULT_ORG_ID,
    verification: {
      threshold: 0.6,
    },
    cooldown: {
      cooldownSec: 300,
    },
    evidence: {
      maxWidth: 640,
      jpegQuality: 0.8,
      maxPerEvent: 1,
    },
    retention: {
      localDays: 30,
      serverDays: 90,
    },
  };
}

export async function loadPolicyConfig(): Promise<PolicyConfig> {
  const { pouchDBService } = await import("./db");
  pouchDBService.init();

  try {
    return await pouchDBService.get<PolicyDoc>(DEFAULT_POLICY_DOC_ID);
  } catch (error) {
    if (isNotFoundError(error)) {
      return createDefaultPolicyConfig();
    }
    throw error;
  }
}

export async function savePolicyConfig(nextPolicy: PolicyConfig): Promise<PolicyConfig> {
  const { pouchDBService } = await import("./db");
  pouchDBService.init();

  const policyDoc: PolicyDoc = {
    ...nextPolicy,
    _id: nextPolicy._id || DEFAULT_POLICY_DOC_ID,
    type: "POLICY_CONFIG",
    orgId: nextPolicy.orgId || DEFAULT_ORG_ID,
  };

  const response = await pouchDBService.put<PolicyDoc>(policyDoc);
  return {
    ...policyDoc,
    _rev: response.rev,
  };
}
