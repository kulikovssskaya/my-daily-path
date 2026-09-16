import "server-only";
import type { JobApplication } from "@/types";
import { getRedisEnv } from "@/lib/sync/redisEnv";

const APPS_PREFIX = "mdp:tg:apps:";
const CHAT_LINK_PREFIX = "mdp:tg:chat:";

async function getRedis() {
  const env = getRedisEnv();
  if (!env) return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis(env);
}

export async function getTelegramApplications(
  chatId: string
): Promise<JobApplication[]> {
  const redis = await getRedis();
  if (!redis) return [];
  const data = await redis.get<JobApplication[]>(`${APPS_PREFIX}${chatId}`);
  return Array.isArray(data) ? data : [];
}

export async function saveTelegramApplications(
  chatId: string,
  apps: JobApplication[]
): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  await redis.set(`${APPS_PREFIX}${chatId}`, apps);
}

export async function upsertTelegramApplication(
  chatId: string,
  app: JobApplication
): Promise<void> {
  const apps = await getTelegramApplications(chatId);
  const idx = apps.findIndex((a) => a.id === app.id || (a.url && app.url && a.url === app.url));
  if (idx >= 0) apps[idx] = { ...apps[idx], ...app };
  else apps.unshift(app);
  await saveTelegramApplications(chatId, apps);
}

export async function linkTelegramChat(token: string, chatId: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  await redis.set(`${CHAT_LINK_PREFIX}${token}`, chatId, { ex: 86400 });
}

export async function resolveTelegramChat(token: string): Promise<string | null> {
  const redis = await getRedis();
  if (!redis) return null;
  const chatId = await redis.get<string>(`${CHAT_LINK_PREFIX}${token}`);
  return chatId ?? null;
}
