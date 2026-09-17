import "server-only";
import type { JobApplication } from "@/types";
import { getRedisEnv } from "@/lib/sync/redisEnv";

/** Only sync applications on/after this date (YYYY-MM-DD). Older bot history is ignored. */
export const MONITOR_SYNC_SINCE =
  process.env.MONITOR_SYNC_SINCE?.trim() || "2026-09-16";

function storageKey(chatId: string): string {
  return `mdp:monitor:${chatId}:applications`;
}

async function getRedis() {
  const env = getRedisEnv();
  if (!env) return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis(env);
}

function appDateKey(app: JobApplication): string | null {
  const iso = app.appliedAt ?? app.createdAt ?? app.updatedAt;
  return iso ? iso.slice(0, 10) : null;
}

export function filterSince(
  apps: JobApplication[],
  since = MONITOR_SYNC_SINCE
): JobApplication[] {
  return apps.filter((a) => {
    const key = appDateKey(a);
    return key != null && key >= since;
  });
}

export async function getMonitorApplications(chatId: string): Promise<JobApplication[]> {
  const redis = await getRedis();
  if (!redis) return [];
  const data = await redis.get<JobApplication[]>(storageKey(chatId));
  const apps = Array.isArray(data) ? data : [];
  return filterSince(apps);
}

export async function replaceMonitorApplications(
  chatId: string,
  incoming: JobApplication[]
): Promise<JobApplication[]> {
  const redis = await getRedis();
  if (!redis) throw new Error("Cloud storage not configured (Upstash Redis)");

  const filtered = filterSince(incoming).sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
  );
  await redis.set(storageKey(chatId), filtered);
  return filtered;
}

export async function upsertMonitorApplications(
  chatId: string,
  incoming: JobApplication[]
): Promise<JobApplication[]> {
  const redis = await getRedis();
  if (!redis) throw new Error("Cloud storage not configured (Upstash Redis)");

  const existing = await getMonitorApplications(chatId);
  const map = new Map<string, JobApplication>();

  for (const app of existing) map.set(app.id, app);

  for (const app of filterSince(incoming)) {
    const byUrl = [...map.values()].find((a) => a.url && app.url && a.url === app.url);
    if (byUrl) {
      map.set(byUrl.id, { ...byUrl, ...app, id: byUrl.id, updatedAt: new Date().toISOString() });
    } else {
      map.set(app.id, app);
    }
  }

  const merged = filterSince([...map.values()]).sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
  );

  await redis.set(storageKey(chatId), merged);
  return merged;
}
