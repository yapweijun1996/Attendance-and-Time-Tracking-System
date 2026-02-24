import type { AttendanceAction, RecentEvent } from "../types";
import { loadRecentEvents } from "./attendance-log";

export const DEFAULT_COOLDOWN_SEC = 300;

export interface CooldownCheckResult {
  allowed: boolean;
  remainingSec: number;
  lastEvent: RecentEvent | null;
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function findLatestActionEvent(
  action: AttendanceAction,
  staffId: string | null,
  events: RecentEvent[]
): RecentEvent | null {
  const candidates = events
    .filter((event) => event.action === action && (staffId ? event.staffId === staffId : true))
    .sort((left, right) => toTimestamp(right.clientTs) - toTimestamp(left.clientTs));
  return candidates.length > 0 ? candidates[0] : null;
}

export async function checkActionCooldown(
  action: AttendanceAction,
  cooldownSec = DEFAULT_COOLDOWN_SEC,
  staffId: string | null = null
): Promise<CooldownCheckResult> {
  const events = await loadRecentEvents(50);
  const latest = findLatestActionEvent(action, staffId, events);
  if (!latest) {
    return {
      allowed: true,
      remainingSec: 0,
      lastEvent: null,
    };
  }

  const nowMs = Date.now();
  const latestMs = toTimestamp(latest.clientTs);
  const elapsedSec = Math.floor((nowMs - latestMs) / 1000);
  if (elapsedSec >= cooldownSec) {
    return {
      allowed: true,
      remainingSec: 0,
      lastEvent: latest,
    };
  }

  return {
    allowed: false,
    remainingSec: cooldownSec - Math.max(elapsedSec, 0),
    lastEvent: latest,
  };
}

class SubmissionLock {
  private activeKeys = new Set<string>();

  acquire(key: string): boolean {
    if (this.activeKeys.has(key)) {
      return false;
    }
    this.activeKeys.add(key);
    return true;
  }

  release(key: string): void {
    this.activeKeys.delete(key);
  }
}

const verifySubmissionLock = new SubmissionLock();

export { SubmissionLock, verifySubmissionLock };
