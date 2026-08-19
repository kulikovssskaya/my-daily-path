import { applyBlobsToLocal, type SyncPayload } from "@/lib/sync/client";
import {
  collectLocalBlobsForPush,
  hasMeaningfulServerBlobs,
} from "@/lib/sync/blobUtils";
import { SYNC_KEY_HEADER } from "@/lib/sync/syncAuth";
import { getLocalSyncMeta, setLocalSyncMeta } from "@/lib/sync/syncAuthClient";
import {
  flushPersistedStoresToLocalStorage,
  rehydrateAllStoresAsync,
} from "@/lib/sync/syncStoreFlush";
import {
  collectChangedBlobsForPush,
  markBlobsPushed,
} from "@/lib/sync/syncTransfer";
import {
  emptySyncSummary,
  type SyncCloudSummary,
} from "@/lib/sync/syncSummary";

export type SyncResponse = SyncPayload & {
  needsKey?: boolean;
  optInRequired?: boolean;
  cloud?: boolean;
} & Partial<SyncCloudSummary>;

function syncHeaders(syncKey: string, extra?: HeadersInit): HeadersInit {
  return { [SYNC_KEY_HEADER]: syncKey, ...extra };
}

export async function fetchServerMeta(
  syncKey: string,
  timeoutMs = 15000
): Promise<SyncResponse | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const localUpdatedAt = getLocalSyncMeta().updatedAt;
    const res = await fetch("/api/sync?meta=1", {
      cache: "no-store",
      signal: controller.signal,
      headers: syncHeaders(
        syncKey,
        localUpdatedAt ? { "If-None-Match": `"${localUpdatedAt}"` } : undefined
      ),
    });
    clearTimeout(timer);

    if (res.status === 304) {
      return {
        updatedAt: localUpdatedAt ?? "",
        blobs: {},
        ...emptySyncSummary(),
      };
    }

    const data = (await res.json()) as SyncResponse;
    if (res.status === 401 && data.needsKey) return data;
    if (!res.ok) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchServerState(
  syncKey: string,
  timeoutMs = 30000
): Promise<SyncResponse | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const localUpdatedAt = getLocalSyncMeta().updatedAt;
    const res = await fetch("/api/sync", {
      cache: "no-store",
      signal: controller.signal,
      headers: syncHeaders(
        syncKey,
        localUpdatedAt ? { "If-None-Match": `"${localUpdatedAt}"` } : undefined
      ),
    });
    clearTimeout(timer);

    if (res.status === 304) {
      return {
        updatedAt: localUpdatedAt ?? "",
        blobs: {},
      };
    }

    const data = (await res.json()) as SyncResponse;
    if (res.status === 401 && data.needsKey) return data;
    if (!res.ok) return null;
    return data;
  } catch {
    return null;
  }
}

type PushOptions = {
  /** Default true for auto-sync: only blobs that changed since last push. */
  onlyChanged?: boolean;
  timeoutMs?: number;
};

async function pushBlobs(
  syncKey: string,
  blobs: ReturnType<typeof collectLocalBlobsForPush>,
  timeoutMs: number
): Promise<SyncPayload | null> {
  if (Object.keys(blobs).length === 0) return null;
  try {
    await rehydrateAllStoresAsync();
  } catch {
    /* ignore */
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...syncHeaders(syncKey),
      },
      body: JSON.stringify({ blobs }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const saved = (await res.json()) as SyncPayload;
    markBlobsPushed(blobs);
    return saved;
  } catch {
    return null;
  }
}

export async function pushToServer(
  syncKey: string,
  options: PushOptions | number = {}
): Promise<SyncPayload | null> {
  const opts: PushOptions =
    typeof options === "number" ? { timeoutMs: options } : options;
  const timeoutMs = opts.timeoutMs ?? 45000;
  const onlyChanged = opts.onlyChanged ?? true;

  flushPersistedStoresToLocalStorage();
  const blobs = onlyChanged
    ? collectChangedBlobsForPush()
    : collectLocalBlobsForPush();
  return pushBlobs(syncKey, blobs, timeoutMs);
}

export async function pushToServerDetailed(
  syncKey: string,
  timeoutMs = 45000
): Promise<
  | { ok: true; payload: SyncPayload }
  | { ok: false; reason: string }
> {
  flushPersistedStoresToLocalStorage();

  // Manual Up always sends the full meaningful snapshot.
  const blobs = collectLocalBlobsForPush();

  if (Object.keys(blobs).length === 0) {
    return { ok: false, reason: "Нет данных для отправки" };
  }

  try {
    await rehydrateAllStoresAsync();
  } catch {
    /* local rehydrate failure should not block upload */
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...syncHeaders(syncKey),
      },
      body: JSON.stringify({ blobs }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    let body: SyncPayload & { error?: string } = { updatedAt: "", blobs: {} };
    try {
      body = (await res.json()) as typeof body;
    } catch {
      /* ignore */
    }

    if (res.status === 401) return { ok: false, reason: "Неверный sync-код" };
    if (res.status === 503) {
      return {
        ok: false,
        reason:
          "Облако не настроено на этом сервере — открой Vercel URL на ПК или npm run sync:env",
      };
    }
    if (!res.ok) {
      return { ok: false, reason: body.error ?? `Ошибка сервера (${res.status})` };
    }
    markBlobsPushed(blobs);
    return { ok: true, payload: body };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return {
        ok: false,
        reason: "Сервер не ответил вовремя — нажми Up ещё раз",
      };
    }
    return { ok: false, reason: "Сеть или таймаут — проверь интернет и попробуй снова" };
  }
}

async function mergeServerBlobs(server: SyncResponse): Promise<boolean> {
  if (!server.blobs || !hasMeaningfulServerBlobs(server.blobs)) return false;
  applyBlobsToLocal(server.blobs, true);
  await rehydrateAllStoresAsync();
  flushPersistedStoresToLocalStorage();
  // Local now matches cloud — avoid re-uploading the same bytes.
  markBlobsPushed(server.blobs);
  return true;
}

type SyncTimeWinner = "cloud" | "local" | "equal";

function compareSyncTimes(
  cloudUpdatedAt: string | null | undefined,
  localUpdatedAt: string | null
): SyncTimeWinner {
  if (!cloudUpdatedAt) return "local";
  if (!localUpdatedAt) return "cloud";
  const cloudMs = Date.parse(cloudUpdatedAt);
  const localMs = Date.parse(localUpdatedAt);
  if (Number.isNaN(cloudMs) || Number.isNaN(localMs)) return "equal";
  if (cloudMs > localMs) return "cloud";
  if (localMs > cloudMs) return "local";
  return "equal";
}

const VISIBLE_SYNC_MIN_MS = 60_000;
let lastVisibleSyncAt = 0;

/** Boot / tab focus: pull when cloud is newer; avoid pushing stale phone state back. */
export async function syncOnAppLoad(syncKey: string): Promise<{
  ok: boolean;
  authFailed?: boolean;
  pulled?: boolean;
  pushed?: boolean;
}> {
  const meta = await fetchServerMeta(syncKey);
  if (meta?.needsKey) return { ok: false, authFailed: true };

  const winner = compareSyncTimes(meta?.updatedAt, getLocalSyncMeta().updatedAt);
  lastVisibleSyncAt = Date.now();

  if (winner === "equal") {
    return { ok: true, pulled: false, pushed: false };
  }

  if (winner === "cloud") {
    const server = await fetchServerState(syncKey);
    if (server?.needsKey) return { ok: false, authFailed: true };
    if (server && hasMeaningfulServerBlobs(server.blobs)) {
      const pulled = await mergeServerBlobs(server);
      if (server.updatedAt) setLocalSyncMeta(server.updatedAt);
      return { ok: true, pulled, pushed: false };
    }
    return { ok: true, pulled: false, pushed: false };
  }

  // Local is newer — upload only changed blobs.
  const saved = await pushToServer(syncKey, { onlyChanged: true });
  if (saved?.updatedAt) {
    setLocalSyncMeta(saved.updatedAt);
    return { ok: true, pulled: false, pushed: true };
  }
  // Timestamps said local was ahead, but content already matches last push.
  if (meta?.updatedAt) setLocalSyncMeta(meta.updatedAt);
  return { ok: true, pulled: false, pushed: false };
}

export async function syncOnVisible(syncKey: string): Promise<{
  ok: boolean;
  authFailed?: boolean;
  pulled?: boolean;
  pushed?: boolean;
}> {
  const now = Date.now();
  if (now - lastVisibleSyncAt < VISIBLE_SYNC_MIN_MS) {
    return { ok: true, pulled: false, pushed: false };
  }
  lastVisibleSyncAt = now;
  return syncOnAppLoad(syncKey);
}

/** Merge cloud → local, then push local → cloud. Safe for phone + PC. */
export async function runCloudSync(syncKey: string): Promise<{
  ok: boolean;
  authFailed?: boolean;
  pulled?: boolean;
  pushed?: boolean;
}> {
  const server = await fetchServerState(syncKey);
  if (server?.needsKey) return { ok: false, authFailed: true };

  const pulled = server ? await mergeServerBlobs(server) : false;
  const saved = await pushToServer(syncKey, { onlyChanged: false });

  if (saved?.updatedAt) {
    setLocalSyncMeta(saved.updatedAt);
    return { ok: true, pulled, pushed: true };
  }
  if (pulled && server?.updatedAt) setLocalSyncMeta(server.updatedAt);
  return { ok: true, pulled, pushed: false };
}

/** Download and merge cloud data (recovery / new device). */
export async function pullFromCloud(syncKey: string): Promise<{
  ok: boolean;
  authFailed?: boolean;
  pulled?: boolean;
  empty?: boolean;
}> {
  const server = await fetchServerState(syncKey);
  if (server?.needsKey) return { ok: false, authFailed: true };
  if (!server?.blobs || !hasMeaningfulServerBlobs(server.blobs)) {
    return { ok: true, empty: true };
  }
  await mergeServerBlobs(server);
  if (server.updatedAt) setLocalSyncMeta(server.updatedAt);
  return { ok: true, pulled: true };
}

export async function verifySyncKey(syncKey: string): Promise<boolean> {
  try {
    const res = await fetch("/api/sync?meta=1", {
      cache: "no-store",
      headers: syncHeaders(syncKey),
    });
    if (res.status === 401) return false;
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

export async function fetchCloudSyncStatus(syncKey: string): Promise<{
  cloudUpdatedAt: string | null;
  scheduleEvents: number;
  importedEvents: number;
  latestEventDay: string | null;
  englishDays: number;
  englishAvg: number | null;
} | null> {
  const server = await fetchServerMeta(syncKey);
  if (!server) return null;

  return {
    cloudUpdatedAt: server.updatedAt,
    scheduleEvents: server.scheduleEvents ?? 0,
    importedEvents: server.importedEvents ?? 0,
    latestEventDay: server.latestEventDay ?? null,
    englishDays: server.englishDays ?? 0,
    englishAvg: server.englishAvg ?? null,
  };
}
