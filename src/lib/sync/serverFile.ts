import "server-only";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { SyncPayload, SyncStorageKey } from "@/lib/sync/client";

const DATA_DIR = path.join(process.cwd(), ".data");
const SYNC_FILE = path.join(DATA_DIR, "sync-state.json");

export async function readSyncState(): Promise<SyncPayload | null> {
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
  await mkdir(DATA_DIR, { recursive: true });
  const payload: SyncPayload = {
    updatedAt: new Date().toISOString(),
    blobs,
  };
  await writeFile(SYNC_FILE, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}
