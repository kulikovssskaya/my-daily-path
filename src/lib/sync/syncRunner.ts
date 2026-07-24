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



export type SyncResponse = SyncPayload & {

  needsKey?: boolean;

  optInRequired?: boolean;

  cloud?: boolean;

};



function syncHeaders(syncKey: string): HeadersInit {

  return { [SYNC_KEY_HEADER]: syncKey };

}



export async function fetchServerState(

  syncKey: string,

  timeoutMs = 12000

): Promise<SyncResponse | null> {

  try {

    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch("/api/sync", {

      cache: "no-store",

      signal: controller.signal,

      headers: syncHeaders(syncKey),

    });

    clearTimeout(timer);

    const data = (await res.json()) as SyncResponse;

    if (res.status === 401 && data.needsKey) return data;

    if (!res.ok) return null;

    return data;

  } catch {

    return null;

  }

}



export async function pushToServer(

  syncKey: string,

  timeoutMs = 12000

): Promise<SyncPayload | null> {

  flushPersistedStoresToLocalStorage();

  const blobs = collectLocalBlobsForPush();

  if (Object.keys(blobs).length === 0) return null;

  await rehydrateAllStoresAsync();

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

      keepalive: true,

    });

    clearTimeout(timer);

    if (!res.ok) return null;

    return (await res.json()) as SyncPayload;

  } catch {

    return null;

  }

}



export async function pushToServerDetailed(

  syncKey: string,

  timeoutMs = 12000

): Promise<

  | { ok: true; payload: SyncPayload }

  | { ok: false; reason: string }

> {

  flushPersistedStoresToLocalStorage();

  const blobs = collectLocalBlobsForPush();

  if (Object.keys(blobs).length === 0) {

    return { ok: false, reason: "Нет данных для отправки" };

  }

  await rehydrateAllStoresAsync();

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

      keepalive: true,

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

    return { ok: true, payload: body };

  } catch {

    return { ok: false, reason: "Сеть или таймаут" };

  }

}



async function mergeServerBlobs(server: SyncResponse): Promise<boolean> {

  if (!server.blobs || !hasMeaningfulServerBlobs(server.blobs)) return false;

  applyBlobsToLocal(server.blobs, true);

  await rehydrateAllStoresAsync();

  flushPersistedStoresToLocalStorage();

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



/** Boot / tab focus: pull when cloud is newer; avoid pushing stale phone state back. */

export async function syncOnAppLoad(syncKey: string): Promise<{

  ok: boolean;

  authFailed?: boolean;

  pulled?: boolean;

  pushed?: boolean;

}> {

  const server = await fetchServerState(syncKey);

  if (server?.needsKey) return { ok: false, authFailed: true };



  const winner = compareSyncTimes(server?.updatedAt, getLocalSyncMeta().updatedAt);



  if (

    winner === "cloud" &&

    server &&

    hasMeaningfulServerBlobs(server.blobs)

  ) {

    const pulled = await mergeServerBlobs(server);

    if (server.updatedAt) setLocalSyncMeta(server.updatedAt);

    return { ok: true, pulled, pushed: false };

  }



  if (winner === "local") {

    const saved = await pushToServer(syncKey);

    if (saved?.updatedAt) {

      setLocalSyncMeta(saved.updatedAt);

      return { ok: true, pulled: false, pushed: true };

    }

    return { ok: true, pulled: false, pushed: false };

  }



  return runCloudSync(syncKey);

}



export async function syncOnVisible(syncKey: string): Promise<{

  ok: boolean;

  authFailed?: boolean;

  pulled?: boolean;

  pushed?: boolean;

}> {

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

  const saved = await pushToServer(syncKey);



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

    const res = await fetch("/api/sync", {

      cache: "no-store",

      headers: syncHeaders(syncKey),

    });

    if (res.status === 401) return false;

    return res.ok;

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

  const server = await fetchServerState(syncKey);

  if (!server?.blobs) return null;



  let scheduleEvents = 0;

  let importedEvents = 0;

  let latestEventDay: string | null = null;

  let englishDays = 0;

  let englishAvg: number | null = null;



  const scheduleRaw = server.blobs["mdp-schedule"];

  if (scheduleRaw) {

    try {

      const parsed = JSON.parse(scheduleRaw) as {

        state?: { events?: { start: string; meta?: { rizeEntryId?: string } }[] };

      };

      const events = parsed.state?.events ?? [];

      scheduleEvents = events.length;

      importedEvents = events.filter((e) => e.meta?.rizeEntryId).length;

      const days = events.map((e) => e.start.slice(0, 10)).sort();

      latestEventDay = days.length > 0 ? days[days.length - 1]! : null;

    } catch {

      /* ignore */

    }

  }



  const englishRaw = server.blobs["mdp-english"];

  if (englishRaw) {

    try {

      const parsed = JSON.parse(englishRaw) as {

        state?: { history?: unknown[]; stats?: { averageScore?: number } };

      };

      englishDays = parsed.state?.history?.length ?? 0;

      englishAvg = parsed.state?.stats?.averageScore ?? null;

    } catch {

      /* ignore */

    }

  }



  return {

    cloudUpdatedAt: server.updatedAt,

    scheduleEvents,

    importedEvents,

    latestEventDay,

    englishDays,

    englishAvg,

  };

}


