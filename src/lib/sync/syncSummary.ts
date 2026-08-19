import type { SyncStorageKey } from "@/lib/sync/client";

export type SyncCloudSummary = {
  scheduleEvents: number;
  importedEvents: number;
  latestEventDay: string | null;
  englishDays: number;
  englishAvg: number | null;
};

export function emptySyncSummary(): SyncCloudSummary {
  return {
    scheduleEvents: 0,
    importedEvents: 0,
    latestEventDay: null,
    englishDays: 0,
    englishAvg: null,
  };
}

/** Derive compact status from blobs without sending blob bodies to the client. */
export function buildSyncSummary(
  blobs: Partial<Record<SyncStorageKey, string>> | undefined
): SyncCloudSummary {
  const summary = emptySyncSummary();
  if (!blobs) return summary;

  const scheduleRaw = blobs["mdp-schedule"];
  if (scheduleRaw) {
    try {
      const parsed = JSON.parse(scheduleRaw) as {
        state?: { events?: { start: string; meta?: { rizeEntryId?: string } }[] };
      };
      const events = parsed.state?.events ?? [];
      summary.scheduleEvents = events.length;
      summary.importedEvents = events.filter((e) => e.meta?.rizeEntryId).length;
      const days = events.map((e) => e.start.slice(0, 10)).sort();
      summary.latestEventDay = days.length > 0 ? days[days.length - 1]! : null;
    } catch {
      /* ignore */
    }
  }

  const englishRaw = blobs["mdp-english"];
  if (englishRaw) {
    try {
      const parsed = JSON.parse(englishRaw) as {
        state?: { history?: unknown[]; stats?: { averageScore?: number } };
      };
      summary.englishDays = parsed.state?.history?.length ?? 0;
      summary.englishAvg = parsed.state?.stats?.averageScore ?? null;
    } catch {
      /* ignore */
    }
  }

  return summary;
}
