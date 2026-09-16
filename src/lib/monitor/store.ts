import "server-only";
import type { JobApplication } from "@/types";
import { getRedisEnv } from "@/lib/sync/redisEnv";

function storageKey(chatId: string): string {
  return `mdp:monitor:${chatId}:applications`;
}

async function getRedis() {
  const env = getRedisEnv();
  if (!env) return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis(env);
}

export async function getMonitorApplications(chatId: string): Promise<JobApplication[]> {
  const redis = await getRedis();
  if (!redis) return [];
  const data = await redis.get<JobApplication[]>(storageKey(chatId));
  return Array.isArray(data) ? data : [];
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

  for (const app of incoming) {
    const byUrl = existing.find((a) => a.url && app.url && a.url === app.url);
    if (byUrl) {
      map.set(byUrl.id, { ...byUrl, ...app, id: byUrl.id, updatedAt: new Date().toISOString() });
    } else {
      map.set(app.id, app);
    }
  }

  const merged = [...map.values()].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
  );

  await redis.set(storageKey(chatId), merged);
  return merged;
}
