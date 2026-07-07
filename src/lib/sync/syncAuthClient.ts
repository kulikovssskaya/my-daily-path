import {
  SYNC_KEY_STORAGE,
  SYNC_META_STORAGE,
} from "@/lib/sync/syncAuth";

export const SYNC_ENABLED_STORAGE = "mdp-sync-enabled";

export function getStoredSyncKey(): string | null {
  if (typeof window === "undefined") return null;
  const key = localStorage.getItem(SYNC_KEY_STORAGE)?.trim();
  return key || null;
}

export function setStoredSyncKey(key: string) {
  localStorage.setItem(SYNC_KEY_STORAGE, key.trim());
}

export function clearStoredSyncKey() {
  localStorage.removeItem(SYNC_KEY_STORAGE);
}

export function isSyncEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(SYNC_ENABLED_STORAGE) !== "true") return false;
  return Boolean(getStoredSyncKey());
}

export function enableSync(key: string) {
  setStoredSyncKey(key);
  localStorage.setItem(SYNC_ENABLED_STORAGE, "true");
}

export function disableSync() {
  localStorage.removeItem(SYNC_ENABLED_STORAGE);
  clearStoredSyncKey();
}

export function getLocalSyncMeta(): { updatedAt: string | null } {
  if (typeof window === "undefined") return { updatedAt: null };
  try {
    const raw = localStorage.getItem(SYNC_META_STORAGE);
    if (!raw) return { updatedAt: null };
    const parsed = JSON.parse(raw) as { updatedAt?: string };
    return { updatedAt: parsed.updatedAt ?? null };
  } catch {
    return { updatedAt: null };
  }
}

export function setLocalSyncMeta(updatedAt: string) {
  localStorage.setItem(SYNC_META_STORAGE, JSON.stringify({ updatedAt }));
}
