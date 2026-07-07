import "server-only";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { SyncPayload, SyncStorageKey } from "@/lib/sync/client";
import { mergeBlobsSafely } from "@/lib/sync/blobUtils";
import { getRedisEnv, isCloudSyncConfigured } from "@/lib/sync/redisEnv";

const KV_KEY = "mdp:sync-state";
const DATA_DIR = path.join(process.cwd(), ".data");
const SYNC_FILE = path.join(DATA_DIR, "sync-state.json");

/** Vercel serverless has no persistent disk; local dev uses .data/sync-state.json. */
export function isSyncPersistenceAvailable(): boolean {
  return !process.env.VERCEL || isCloudSyncConfigured();
}

async function getRedis() {
  const env = getRedisEnv();
  if (!env) return null;
  const { Redis } = await import("@upstash/redis");
  return new Redis(env);
}

async function readFromRedis(): Promise<SyncPayload | null> {
  if (!isCloudSyncConfigured()) return null;
  try {
    const redis = await getRedis();
    if (!redis) return null;
    const data = await redis.get<SyncPayload>(KV_KEY);
    if (!data || !data.updatedAt || !data.blobs) return null;
    return data;
  } catch {
    return null;
  }
}

async function writeToRedis(
  blobs: Partial<Record<SyncStorageKey, string>>
): Promise<SyncPayload> {
  const existing = (await readFromRedis())?.blobs ?? {};
  const payload: SyncPayload = {
    updatedAt: new Date().toISOString(),
    blobs: mergeBlobsSafely(existing, blobs),
  };
  if (!isCloudSyncConfigured()) return payload;
  const redis = await getRedis();
  if (!redis) return payload;
  await redis.set(KV_KEY, payload);
  return payload;
}

async function readFromFile(): Promise<SyncPayload | null> {
  try {
    const raw = await readFile(SYNC_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SyncPayload;
    if (!parsed.updatedAt || !parsed.blobs) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeToFile(
  blobs: Partial<Record<SyncStorageKey, string>>
): Promise<SyncPayload> {
  const existing = (await readFromFile())?.blobs ?? {};
  const payload: SyncPayload = {
    updatedAt: new Date().toISOString(),
    blobs: mergeBlobsSafely(existing, blobs),
  };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SYNC_FILE, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

export async function readSyncState(): Promise<SyncPayload | null> {
  if (isCloudSyncConfigured()) return readFromRedis();
  if (process.env.VERCEL) return null;
  return readFromFile();
}

export async function writeSyncState(
  blobs: Partial<Record<SyncStorageKey, string>>
): Promise<SyncPayload> {
  if (isCloudSyncConfigured()) return writeToRedis(blobs);
  if (process.env.VERCEL) {
    return { updatedAt: new Date().toISOString(), blobs };
  }
  return writeToFile(blobs);
}
