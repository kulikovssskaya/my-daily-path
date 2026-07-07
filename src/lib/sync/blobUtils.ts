import {
  SYNC_STORAGE_KEYS,
  collectLocalBlobs,
  type SyncStorageKey,
} from "@/lib/sync/client";
import {
  mergeEnglishPersistBlobs,
  reconcileEnglishPersistBlob,
} from "@/lib/sync/englishBlobMerge";
import {
  mergeSchedulePersistBlobs,
  reconcileSchedulePersistBlob,
} from "@/lib/sync/scheduleBlobMerge";

function parsePersistState(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    return parsed?.state ?? (parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

function arrayLen(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/** Per-store check — English-only sessions must sync even when total size is small. */
export function isMeaningfulBlob(key: SyncStorageKey, raw: string): boolean {
  if (!raw || raw.length < 60) return false;
  const state = parsePersistState(raw);
  if (!state) return raw.length > 300;

  switch (key) {
    case "mdp-english":
      return (
        arrayLen(state.vocabulary) > 0 ||
        arrayLen(state.history) > 0 ||
        state.activeSession != null
      );
    case "mdp-schedule":
      return arrayLen(state.events) > 0 || arrayLen(state.habits) > 0;
    case "mdp-progress":
      return arrayLen(state.logs) > 0 || arrayLen(state.tracks) > 0;
    case "mdp-cooking":
      return arrayLen(state.fridge) > 0 || arrayLen(state.recipes) > 0;
    case "mdp-career":
      return arrayLen(state.applications) > 0 || Boolean(state.cvMarkdown);
    case "mdp-memory":
      return (
        arrayLen(state.goals) > 0 ||
        arrayLen(state.notes) > 0 ||
        arrayLen(state.preferences) > 0
      );
    case "mdp-permanent-archive":
      return arrayLen(state.scheduleEvents) > 0 || arrayLen(state.dailyLogs) > 0;
    default:
      return raw.length > 250;
  }
}

export function blobByteSize(
  blobs: Partial<Record<SyncStorageKey, string>> | undefined
): number {
  if (!blobs) return 0;
  return Object.values(blobs).reduce((n, s) => n + (s?.length ?? 0), 0);
}

export function hasMeaningfulLocalData(): boolean {
  return Object.keys(collectLocalBlobsForPush()).length > 0;
}

export function hasMeaningfulServerBlobs(
  blobs: Partial<Record<SyncStorageKey, string>> | undefined
): boolean {
  if (!blobs) return false;
  return SYNC_STORAGE_KEYS.some((key) => {
    const raw = blobs[key];
    return Boolean(raw && isMeaningfulBlob(key, raw));
  });
}

export function collectLocalBlobsForPush(): Partial<Record<SyncStorageKey, string>> {
  const all = collectLocalBlobs();
  const out: Partial<Record<SyncStorageKey, string>> = {};
  for (const key of SYNC_STORAGE_KEYS) {
    let raw = all[key];
    if (raw && key === "mdp-english") {
      raw = reconcileEnglishPersistBlob(raw);
      if (typeof window !== "undefined") {
        localStorage.setItem(key, raw);
      }
    }
    if (raw && key === "mdp-schedule") {
      raw = reconcileSchedulePersistBlob(raw);
      if (typeof window !== "undefined") {
        localStorage.setItem(key, raw);
      }
    }
    if (raw && isMeaningfulBlob(key, raw)) out[key] = raw;
  }
  return out;
}

function mergeStorageBlob(
  key: SyncStorageKey,
  prev: string | undefined,
  inc: string
): string {
  if (key === "mdp-english") {
    return prev ? mergeEnglishPersistBlobs(prev, inc) : reconcileEnglishPersistBlob(inc);
  }
  if (key === "mdp-schedule") {
    return prev ? mergeSchedulePersistBlobs(prev, inc) : reconcileSchedulePersistBlob(inc);
  }
  if (!prev || inc.length >= prev.length) return inc;
  return prev;
}

/** Prefer richer content; English and schedule use field-level merge. */
export function mergeBlobsSafely(
  existing: Partial<Record<SyncStorageKey, string>>,
  incoming: Partial<Record<SyncStorageKey, string>>
): Partial<Record<SyncStorageKey, string>> {
  const merged: Partial<Record<SyncStorageKey, string>> = { ...existing };
  for (const key of SYNC_STORAGE_KEYS) {
    const inc = incoming[key];
    if (!inc) continue;
    merged[key] = mergeStorageBlob(key, merged[key], inc);
  }
  for (const key of SYNC_STORAGE_KEYS) {
    if (key === "mdp-english" && merged[key]) {
      merged[key] = reconcileEnglishPersistBlob(merged[key]!);
    }
    if (key === "mdp-schedule" && merged[key]) {
      merged[key] = reconcileSchedulePersistBlob(merged[key]!);
    }
  }
  return merged;
}
