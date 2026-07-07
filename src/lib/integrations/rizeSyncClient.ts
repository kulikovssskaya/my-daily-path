import type { RizeCalendarEvent, RizeFetchStats } from "@/lib/integrations/rize";
import { getStoredSyncKey, isSyncEnabled } from "@/lib/sync/syncAuthClient";
import { pullFromCloud, runCloudSync } from "@/lib/sync/syncRunner";

const DEFAULT_RIZE_LOOKBACK_HOURS = 336;

export interface RizeSyncResult {
  ok: boolean;
  added: number;
  updated: number;
  removed: number;
  skipped: number;
  count: number;
  stats?: RizeFetchStats;
  error?: string;
  pushed?: boolean;
}

export async function pullRizeEvents(
  lookbackHours = 168
): Promise<
  | { events: RizeCalendarEvent[]; count: number; stats: RizeFetchStats }
  | { error: string; status: number }
> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const params = new URLSearchParams({
    lookbackHours: String(lookbackHours),
    timezone: timeZone,
  });

  const res = await fetch(`/api/integrations/rize/sync?${params}`, {
    method: "POST",
    cache: "no-store",
  });
  let data: {
    events?: RizeCalendarEvent[];
    count?: number;
    stats?: RizeFetchStats;
    error?: string;
  } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { error: `Sync failed (${res.status})`, status: res.status };
  }
  if (!res.ok) {
    return { error: data.error ?? `Sync failed (${res.status})`, status: res.status };
  }
  const events = data.events ?? [];
  return {
    events,
    count: events.length,
    stats: data.stats ?? emptyStats(),
  };
}

function emptyStats(): RizeFetchStats {
  return {
    timeEntries: 0,
    projectEntries: 0,
    taskEntries: 0,
    sessions: 0,
    appsTracked: 0,
    summaries: 0,
    appBlocks: 0,
    categoryBlocks: 0,
    totalRaw: 0,
    inWindow: 0,
    mapped: 0,
    tooShort: 0,
    sources: [],
    probeErrors: [],
  };
}

export function formatRizeSyncMessage(result: RizeSyncResult): string {
  if (!result.ok) return result.error ?? "Sync failed";

  const parts: string[] = [];
  if (result.removed) parts.push(`replaced ${result.removed}`);
  if (result.added) parts.push(`+${result.added} from Rize`);
  if (result.skipped) parts.push(`${result.skipped} kept (edited)`);
  if (result.pushed) parts.push("saved to cloud");

  const s = result.stats;
  if (s?.timeEntries) parts.push(`${s.timeEntries} Rize entries`);
  if (s?.noTracking) parts.push(`${s.noTracking} skipped (no tracking)`);

  if (parts.length > 0) return parts.join(" · ");

  if (!s || result.count === 0) {
    return "Rize returned 0 entries for this period — check API key or Rize timeline";
  }

  return `Refreshed ${result.count} blocks from Rize`;
}

export async function syncRizeToCalendar(
  lookbackHours = DEFAULT_RIZE_LOOKBACK_HOURS
): Promise<RizeSyncResult> {
  const { useScheduleStore } = await import("@/stores/scheduleStore");

  if (isSyncEnabled()) {
    const key = getStoredSyncKey();
    if (key) await pullFromCloud(key);
  }

  const pulled = await pullRizeEvents(lookbackHours);
  if ("error" in pulled) {
    return {
      ok: false,
      added: 0,
      updated: 0,
      removed: 0,
      skipped: 0,
      count: 0,
      error: pulled.error,
    };
  }

  useScheduleStore.getState().removeInternalRizeEvents();
  const { added, removed, skipped } = useScheduleStore
    .getState()
    .replaceRizeEvents(pulled.events, lookbackHours);

  let pushed = false;
  if (isSyncEnabled()) {
    const key = getStoredSyncKey();
    if (key) {
      const synced = await runCloudSync(key);
      pushed = Boolean(synced.pushed);
    }
  }

  return {
    ok: true,
    count: pulled.count,
    stats: pulled.stats,
    added,
    updated: 0,
    removed,
    skipped,
    pushed,
  };
}

export async function isRizeConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/integrations/rize/sync", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { configured?: boolean };
    return Boolean(data.configured);
  } catch {
    return false;
  }
}
