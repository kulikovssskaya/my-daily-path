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
  lookbackHours = 168,
  generate = false
): Promise<
  | { events: RizeCalendarEvent[]; count: number; stats: RizeFetchStats }
  | { error: string; status: number }
> {
  const params = new URLSearchParams({
    lookbackHours: String(lookbackHours),
  });
  if (generate) params.set("generate", "true");

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
  return {
    events: data.events ?? [],
    count: data.count ?? 0,
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
  if (result.updated) parts.push(`${result.updated} updated`);
  if (result.skipped) parts.push(`${result.skipped} locked, skipped`);
  if (parts.length > 0) {
    const s = result.stats;
    if (s?.appBlocks) parts.push(`${s.appBlocks} apps`);
    else if (s?.categoryBlocks) parts.push(`${s.categoryBlocks} categories`);
    else if (s?.summaries && s.sources.includes("summaries")) {
      parts.push(`${s.summaries} activity blocks`);
    }
    return parts.join(" · ");
  }

  const s = result.stats;
  if (!s) return "Already up to date";

  if (s.generated && s.mapped === 0 && !s.appBlocks && !s.categoryBlocks && s.generateError) {
    return `Generate failed: ${s.generateError}`;
  }

  if (s.generated && s.mapped === 0 && !s.appBlocks && !s.categoryBlocks && s.totalRaw > 0) {
    return `Found ${s.totalRaw} Rize entries but none fit the calendar (too short?)`;
  }

  if (s.generated && s.mapped === 0 && !s.appBlocks && !s.categoryBlocks) {
    return "AI generation pending — try Sync now (app blocks are built automatically)";
  }

  if (s.appsTracked > 0 && s.totalRaw === 0) {
    const hint = s.probeErrors[0] ? ` (${s.probeErrors[0]})` : "";
    const top = s.topAppMinutes ? ` — top app ~${s.topAppMinutes} min` : "";
    return `${s.appsTracked} apps tracked but no blocks created${top}${hint}`;
  }

  if (s.totalRaw === 0) {
    if (s.userEmail) {
      return `0 entries for ${s.userEmail} (7d) — is Rize desktop running?`;
    }
    return "0 entries (7d) — open Rize desktop and enable tracking";
  }

  if (s.mapped === 0 && s.tooShort > 0) {
    return `${s.totalRaw} entries found, all under 1 min`;
  }

  return "Already up to date";
}

export async function syncRizeToCalendar(
  lookbackHours = 168,
  generate = false
): Promise<RizeSyncResult> {
  const { useScheduleStore } = await import("@/stores/scheduleStore");
  const pulled = await pullRizeEvents(lookbackHours, generate);
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
