/** localStorage keys used by Zustand persist — synced across devices via /api/sync */

export const SYNC_STORAGE_KEYS = [
  "mdp-schedule",
  "mdp-progress",
  "mdp-memory",
  "mdp-cooking",
  "mdp-career",
  "mdp-english",
  "mdp-permanent-archive",
] as const;

export type SyncStorageKey = (typeof SYNC_STORAGE_KEYS)[number];

export interface SyncPayload {
  updatedAt: string;
  blobs: Partial<Record<SyncStorageKey, string>>;
}

export function collectLocalBlobs(): Partial<Record<SyncStorageKey, string>> {
  if (typeof window === "undefined") return {};
  const blobs: Partial<Record<SyncStorageKey, string>> = {};
  for (const key of SYNC_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) blobs[key] = raw;
  }
  return blobs;
}

import { mergeBlobsSafely } from "@/lib/sync/blobUtils";

export function applyBlobsToLocal(
  blobs: Partial<Record<SyncStorageKey, string>>,
  merge = true
) {
  if (typeof window === "undefined") return;
  if (!merge) {
    for (const key of SYNC_STORAGE_KEYS) {
      const raw = blobs[key];
      if (raw) localStorage.setItem(key, raw);
    }
    return;
  }
  const existing: Partial<Record<SyncStorageKey, string>> = {};
  for (const key of SYNC_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) existing[key] = raw;
  }
  const merged = mergeBlobsSafely(existing, blobs);
  for (const key of SYNC_STORAGE_KEYS) {
    const raw = merged[key];
    if (raw) localStorage.setItem(key, raw);
  }
}

export function hasLocalData(): boolean {
  if (typeof window === "undefined") return false;
  return SYNC_STORAGE_KEYS.some((k) => {
    const raw = localStorage.getItem(k);
    return Boolean(raw && raw.length > 2);
  });
}
