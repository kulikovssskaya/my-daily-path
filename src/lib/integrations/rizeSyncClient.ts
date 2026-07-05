import type { RizeCalendarEvent, RizeFetchStats } from "@/lib/integrations/rize";

export interface RizeSyncResult {
  ok: boolean;
  added: number;
  updated: number;
  skipped: number;
  count: number;
  stats?: RizeFetchStats;
  error?: string;
}

export async function pullRizeEvents(
  lookbackHours = 168
): Promise<
  | { events: RizeCalendarEvent[]; count: number; stats: RizeFetchStats }
  | { error: string; status: number }
> {
  const params = new URLSearchParams({ lookbackHours: String(lookbackHours) });

  const res = await fetch(`/api/integrations/rize/sync?${params}`, {
    method: "POST",
    cache: "no-store",
  });
  const data = (await res.json()) as {
    events?: RizeCalendarEvent[];
    count?: number;
    stats?: RizeFetchStats;
    error?: string;
  };
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
  if (result.added) parts.push(`+${result.added} new`);
  if (result.skipped) parts.push(`${result.skipped} kept (your edits)`);

  if (parts.length > 0) {
    const s = result.stats;
    if (s?.timeEntries) parts.push(`${s.timeEntries} from Rize`);
    return parts.join(" · ");
  }

  const s = result.stats;
  if (!s) return "Nothing new from Rize";

  if (s.totalRaw === 0) {
    return "Nothing new from Rize for the last 7 days";
  }

  return "Nothing new — existing blocks kept";
}

export async function syncRizeToCalendar(lookbackHours = 168): Promise<RizeSyncResult> {
  const { useScheduleStore } = await import("@/stores/scheduleStore");
  const pulled = await pullRizeEvents(lookbackHours);
  if ("error" in pulled) {
    return {
      ok: false,
      added: 0,
      updated: 0,
      skipped: 0,
      count: 0,
      error: pulled.error,
    };
  }
  const merge = useScheduleStore.getState().mergeRizeEvents(pulled.events);
  return {
    ok: true,
    count: pulled.count,
    stats: pulled.stats,
    ...merge,
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
