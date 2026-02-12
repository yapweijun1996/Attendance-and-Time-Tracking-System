import type { AttendanceAction, GeoStatus, RecentEvent, SyncState } from "../types";
import type { EvidenceAttachment } from "./evidence";

interface AttendanceLogDoc extends Record<string, unknown> {
  _id: string;
  type: "ATTENDANCE_LOG";
  eventId: string;
  staffId: string;
  deviceId: string;
  action: AttendanceAction;
  clientTs: string;
  serverTs: string | null;
  syncState: SyncState;
  verify: {
    score: number;
    result: "PASS" | "FAIL";
  };
  geoPolicyResult: {
    status: GeoStatus;
    distanceM: number | null;
  };
  gps: {
    lat: number | null;
    lng: number | null;
    accuracyM: number | null;
  };
  _attachments?: {
    "evidence.jpg": EvidenceAttachment;
  };
}

export interface CreateAttendanceLogInput {
  eventId: string;
  staffId: string;
  action: AttendanceAction;
  clientTs: string;
  syncState: SyncState;
  verifyScore: number;
  deviceId: string;
  geoStatus: GeoStatus;
  distanceM: number | null;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  evidenceAttachment?: EvidenceAttachment;
}

function mapDocToRecentEvent(doc: AttendanceLogDoc): RecentEvent {
  return {
    id: doc.eventId,
    action: doc.action,
    clientTs: doc.clientTs,
    geoStatus: doc.geoPolicyResult.status,
    syncState: doc.syncState,
  };
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isAttendanceLogDoc(doc: unknown): doc is AttendanceLogDoc {
  if (doc === null || typeof doc !== "object") {
    return false;
  }

  const candidate = doc as Partial<AttendanceLogDoc>;
  return (
    candidate.type === "ATTENDANCE_LOG" &&
    typeof candidate.eventId === "string" &&
    (candidate.action === "IN" || candidate.action === "OUT") &&
    typeof candidate.clientTs === "string" &&
    typeof candidate.syncState === "string" &&
    candidate.geoPolicyResult !== undefined &&
    typeof candidate.geoPolicyResult.status === "string"
  );
}

export function createAttendanceLog(input: CreateAttendanceLogInput): AttendanceLogDoc {
  return {
    _id: `log::${input.eventId}`,
    type: "ATTENDANCE_LOG",
    eventId: input.eventId,
    staffId: input.staffId,
    deviceId: input.deviceId,
    action: input.action,
    clientTs: input.clientTs,
    serverTs: null,
    syncState: input.syncState,
    verify: {
      score: input.verifyScore,
      result: "PASS",
    },
    geoPolicyResult: {
      status: input.geoStatus,
      distanceM: input.distanceM,
    },
    gps: {
      lat: input.lat,
      lng: input.lng,
      accuracyM: input.accuracyM,
    },
    _attachments: input.evidenceAttachment
      ? {
          "evidence.jpg": input.evidenceAttachment,
        }
      : undefined,
  };
}

export async function loadRecentEvents(limit = 30): Promise<RecentEvent[]> {
  const { pouchDBService } = await import("../../services/db");
  const database = pouchDBService.getDatabase();

  const response = await database.allDocs({
    include_docs: true,
  });

  const docs: AttendanceLogDoc[] = [];
  for (const row of response.rows) {
    if (isAttendanceLogDoc(row.doc)) {
      docs.push(row.doc);
    }
  }

  const events = docs
    .sort((left, right) => toTimestamp(right.clientTs) - toTimestamp(left.clientTs))
    .slice(0, limit)
    .map((doc) => mapDocToRecentEvent(doc));

  return events;
}

export async function saveAttendanceLog(doc: AttendanceLogDoc): Promise<void> {
  const { pouchDBService } = await import("../../services/db");
  pouchDBService.init();
  await pouchDBService.put<AttendanceLogDoc>(doc);
}

function isConflictError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as { status?: number; name?: string };
  return candidate.status === 409 || candidate.name === "conflict";
}

export interface SaveAttendanceLogResult {
  status: "CREATED" | "DUPLICATE";
}

export async function saveAttendanceLogIdempotent(
  doc: AttendanceLogDoc
): Promise<SaveAttendanceLogResult> {
  try {
    await saveAttendanceLog(doc);
    return { status: "CREATED" };
  } catch (error) {
    if (isConflictError(error)) {
      return { status: "DUPLICATE" };
    }
    throw error;
  }
}
