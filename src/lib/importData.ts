import type {
  DailyLog,
  DailyReport,
  Habit,
  JobApplication,
  LearningTrack,
  ScheduleEvent,
  UserMemory,
  WeeklyReport,
} from "@/types";
import {
  EXPORT_VERSION,
  type MyDailyPathExport,
} from "@/lib/exportData";

export type ImportApplyResult = {
  events: number;
  habits: number;
  logs: number;
  tracks: number;
  reports: number;
  applications: number;
  memoryNotes: number;
  todayEvents: number;
  todayLogs: number;
  today: string;
};

type PersistWrapper = { state?: Record<string, unknown>; version?: number };

function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function modifiedAt(item: { lastModifiedAt?: string }): number {
  return item.lastModifiedAt ? Date.parse(item.lastModifiedAt) : 0;
}

/** Prefer incoming when newer or equal (export restore). */
export function mergeByIdPreferIncoming<T extends { id: string; lastModifiedAt?: string }>(
  local: T[],
  incoming: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of incoming) {
    const prev = map.get(item.id);
    if (!prev || modifiedAt(item) >= modifiedAt(prev)) map.set(item.id, item);
  }
  return [...map.values()];
}

function isDiaryExport(value: unknown): value is MyDailyPathExport {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<MyDailyPathExport>;
  return (
    v.meta?.app === "My Daily Path" &&
    Array.isArray(v.schedule?.events) &&
    Array.isArray(v.progress?.dailyLogs)
  );
}

function parsePersistState(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as PersistWrapper;
    if (parsed?.state && typeof parsed.state === "object") return parsed.state;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function diaryFromSyncBlobs(blobs: Record<string, string>): MyDailyPathExport | null {
  const schedule = blobs["mdp-schedule"]
    ? parsePersistState(blobs["mdp-schedule"])
    : null;
  const progress = blobs["mdp-progress"]
    ? parsePersistState(blobs["mdp-progress"])
    : null;
  const memory = blobs["mdp-memory"]
    ? parsePersistState(blobs["mdp-memory"])
    : null;
  const career = blobs["mdp-career"]
    ? parsePersistState(blobs["mdp-career"])
    : null;

  if (!schedule && !progress) return null;

  const events = Array.isArray(schedule?.events)
    ? (schedule!.events as ScheduleEvent[])
    : [];
  const habits = Array.isArray(schedule?.habits)
    ? (schedule!.habits as Habit[])
    : [];
  const logs = Array.isArray(progress?.logs)
    ? (progress!.logs as DailyLog[])
    : [];
  const tracks = Array.isArray(progress?.tracks)
    ? (progress!.tracks as LearningTrack[])
    : [];
  const reports = Array.isArray(progress?.reports)
    ? (progress!.reports as DailyReport[])
    : [];
  const goal =
    progress?.goal && typeof progress.goal === "object"
      ? (progress.goal as { title: string; targetHours: number })
      : { title: "", targetHours: 0 };
  const applications = Array.isArray(career?.applications)
    ? (career!.applications as JobApplication[])
    : [];

  const mem: UserMemory = {
    goals: Array.isArray(memory?.goals) ? (memory!.goals as string[]) : [],
    values: Array.isArray(memory?.values) ? (memory!.values as string[]) : [],
    constraints: Array.isArray(memory?.constraints)
      ? (memory!.constraints as string[])
      : [],
    learningPace:
      memory?.learningPace && typeof memory.learningPace === "object"
        ? (memory.learningPace as UserMemory["learningPace"])
        : {},
    preferences: Array.isArray(memory?.preferences)
      ? (memory!.preferences as string[])
      : [],
    notes: Array.isArray(memory?.notes)
      ? (memory!.notes as UserMemory["notes"])
      : [],
  };

  return {
    meta: {
      app: "My Daily Path",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      hint: "Imported from sync-state blobs",
    },
    schedule: {
      events,
      habits,
      doneEvents: events.filter((e) => e.status === "done"),
    },
    progress: {
      dailyLogs: logs,
      tracks,
      reports,
      goal,
    },
    memory: mem,
    career: { applications },
  };
}

/** Accept diary export JSON or `{ blobs: { "mdp-schedule": ... } }` sync backup. */
export function parseImportFile(raw: string): MyDailyPathExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  if (isDiaryExport(parsed)) return parsed;

  if (parsed && typeof parsed === "object" && "blobs" in parsed) {
    const blobs = (parsed as { blobs?: Record<string, string> }).blobs;
    if (blobs && typeof blobs === "object") {
      const diary = diaryFromSyncBlobs(blobs);
      if (diary) return diary;
    }
  }

  throw new Error(
    "Unrecognized file. Use a Full JSON export from Progress, or a sync-state backup."
  );
}

export type LocalDiarySnapshot = {
  events: ScheduleEvent[];
  habits: Habit[];
  logs: DailyLog[];
  tracks: LearningTrack[];
  reports: DailyReport[];
  weeklyReports?: WeeklyReport[];
  goal: { title: string; targetHours: number };
  memory: UserMemory;
  applications: JobApplication[];
};

export function mergeDiaryImport(
  local: LocalDiarySnapshot,
  incoming: MyDailyPathExport
): LocalDiarySnapshot {
  const events = mergeByIdPreferIncoming(local.events, incoming.schedule.events);
  const habits = mergeByIdPreferIncoming(local.habits, incoming.schedule.habits);
  const logs = mergeByIdPreferIncoming(local.logs, incoming.progress.dailyLogs);
  const tracks = mergeByIdPreferIncoming(
    local.tracks,
    incoming.progress.tracks
  );
  const reports = mergeByIdPreferIncoming(
    local.reports,
    incoming.progress.reports
  );
  const applications = mergeByIdPreferIncoming(
    local.applications,
    incoming.career.applications
  );

  const noteMap = new Map(local.memory.notes.map((n) => [n.id, n]));
  for (const n of incoming.memory.notes ?? []) noteMap.set(n.id, n);

  const memory: UserMemory = {
    goals:
      incoming.memory.goals?.length > 0
        ? incoming.memory.goals
        : local.memory.goals,
    values:
      incoming.memory.values?.length > 0
        ? incoming.memory.values
        : local.memory.values,
    constraints:
      incoming.memory.constraints?.length > 0
        ? incoming.memory.constraints
        : local.memory.constraints,
    preferences:
      incoming.memory.preferences?.length > 0
        ? incoming.memory.preferences
        : local.memory.preferences,
    learningPace: {
      ...local.memory.learningPace,
      ...(incoming.memory.learningPace ?? {}),
    },
    notes: [...noteMap.values()],
  };

  const goal =
    incoming.progress.goal?.title || incoming.progress.goal?.targetHours
      ? incoming.progress.goal
      : local.goal;

  return {
    events,
    habits,
    logs,
    tracks,
    reports,
    weeklyReports: local.weeklyReports,
    goal,
    memory,
    applications,
  };
}

export function summarizeImport(
  merged: LocalDiarySnapshot,
  incoming: MyDailyPathExport
): ImportApplyResult {
  const today = todayLocalDate();
  return {
    events: incoming.schedule.events.length,
    habits: incoming.schedule.habits.length,
    logs: incoming.progress.dailyLogs.length,
    tracks: incoming.progress.tracks.length,
    reports: incoming.progress.reports.length,
    applications: incoming.career.applications.length,
    memoryNotes: incoming.memory.notes?.length ?? 0,
    todayEvents: merged.events.filter((e) => e.start.startsWith(today)).length,
    todayLogs: merged.logs.filter((l) => l.date === today).length,
    today,
  };
}
