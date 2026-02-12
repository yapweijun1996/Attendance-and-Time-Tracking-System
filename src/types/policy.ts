import type { DocMeta } from "./domain";

export interface VerificationPolicy {
  threshold: number;
}

export interface CooldownPolicy {
  cooldownSec: number;
}

export interface EvidencePolicy {
  maxWidth: number;
  jpegQuality: number;
  maxPerEvent: number;
}

export interface RetentionPolicy {
  localDays: number;
  serverDays: number;
}

export interface PolicyConfig extends DocMeta {
  type: "POLICY_CONFIG";
  orgId: string;
  verification: VerificationPolicy;
  cooldown: CooldownPolicy;
  evidence: EvidencePolicy;
  retention: RetentionPolicy;
}
