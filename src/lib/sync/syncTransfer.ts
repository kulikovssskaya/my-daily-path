import {
  SYNC_STORAGE_KEYS,
  type SyncStorageKey,
} from "@/lib/sync/client";
import { collectLocalBlobsForPush } from "@/lib/sync/blobUtils";

export const SYNC_PUSHED_HASHES_STORAGE = "mdp-sync-pushed-hashes";

/** Fast non-crypto fingerprint for change detection (not security). */
export function fingerprintBlob(raw: string): string {
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${raw.length.toString(36)}:${(h >>> 0).toString(36)}`;
}

export function readPushedHashes(): Partial<Record<SyncStorageKey, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SYNC_PUSHED_HASHES_STORAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<SyncStorageKey, string>>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writePushedHashes(hashes: Partial<Record<SyncStorageKey, string>>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SYNC_PUSHED_HASHES_STORAGE, JSON.stringify(hashes));
}

/** Record hashes for blobs that were successfully uploaded. */
export function markBlobsPushed(blobs: Partial<Record<SyncStorageKey, string>>) {
  const next = { ...readPushedHashes() };
  for (const key of SYNC_STORAGE_KEYS) {
    const raw = blobs[key];
    if (raw) next[key] = fingerprintBlob(raw);
  }
  writePushedHashes(next);
}

/**
 * Meaningful local blobs whose content differs from the last successful push.
 * Empty → skip the network request.
 */
export function collectChangedBlobsForPush(): Partial<Record<SyncStorageKey, string>> {
  const all = collectLocalBlobsForPush();
  const pushed = readPushedHashes();
  const out: Partial<Record<SyncStorageKey, string>> = {};
  for (const key of SYNC_STORAGE_KEYS) {
    const raw = all[key];
    if (!raw) continue;
    if (pushed[key] === fingerprintBlob(raw)) continue;
    out[key] = raw;
  }
  return out;
}
