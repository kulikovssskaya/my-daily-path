import "server-only";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { SyncPayload, SyncStorageKey } from "@/lib/sync/client";

const DATA_DIR = path.join(process.cwd(), ".data");
const SYNC_FILE = path.join(DATA_DIR, "sync-state.json");

/** Vercel serverless has no persistent disk; sync stays in browser localStorage. */
export function isSyncPersistenceAvailable(): boolean {
  return !process.env.VERCEL;
}

export async function readSyncState(): Promise<SyncPayload | null> {
  if (!isSyncPersistenceAvailable()) return null;
  try {
    const raw = await readFile(SYNC_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SyncPayload;
    if (!parsed.updatedAt || !parsed.blobs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeSyncState(blobs: Partial<Record<SyncStorageKey, string>>) {
  const payload: SyncPayload = {
    updatedAt: new Date().toISOString(),
    blobs,
  };
  if (!isSyncPersistenceAvailable()) {
    return payload;
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SYNC_FILE, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}
