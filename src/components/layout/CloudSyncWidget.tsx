"use client";



import * as React from "react";

import { Cloud, Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

import { SyncKeySetup } from "@/components/layout/SyncKeySetup";

import {

  disableSync,

  enableSync,

  getLocalSyncMeta,

  getStoredSyncKey,

  isSyncEnabled,

} from "@/lib/sync/syncAuthClient";

import {

  fetchCloudSyncStatus,

  pullFromCloud,

  pushToServer,

  pushToServerDetailed,

  runCloudSync,

  verifySyncKey,

} from "@/lib/sync/syncRunner";

import { getLocalSyncDiagnostics } from "@/lib/sync/syncStoreFlush";

import { cn } from "@/lib/utils";



function formatSyncTime(iso: string | null | undefined): string {

  if (!iso) return "never";

  try {

    return new Date(iso).toLocaleString();

  } catch {

    return iso;

  }

}



export function CloudSyncWidget({ collapsed }: { collapsed?: boolean }) {

  const [cloud, setCloud] = React.useState(false);

  const [enabled, setEnabled] = React.useState(false);

  const [showSetup, setShowSetup] = React.useState(false);

  const [busy, setBusy] = React.useState(false);

  const [hint, setHint] = React.useState<string | null>(null);

  const [localDiag, setLocalDiag] = React.useState<ReturnType<typeof getLocalSyncDiagnostics> | null>(

    null

  );

  const [cloudDiag, setCloudDiag] = React.useState<Awaited<

    ReturnType<typeof fetchCloudSyncStatus>

  > | null>(null);



  const refreshDiagnostics = React.useCallback(async () => {

    setLocalDiag(getLocalSyncDiagnostics());

    const key = getStoredSyncKey();

    if (key && isSyncEnabled()) {

      setCloudDiag(await fetchCloudSyncStatus(key));

    } else {

      setCloudDiag(null);

    }

  }, []);



  React.useEffect(() => {

    setEnabled(isSyncEnabled());

    void fetch("/api/sync/config", { cache: "no-store" })

      .then((r) => r.json())

      .then((d: { cloud?: boolean }) => setCloud(Boolean(d.cloud)))

      .catch(() => setCloud(false));

    void refreshDiagnostics();

  }, [refreshDiagnostics]);



  const key = () => getStoredSyncKey();



  const onKeySaved = React.useCallback(async (code: string) => {

    if (!(await verifySyncKey(code))) {

      setHint("Неверный sync-код.");

      return;

    }

    enableSync(code);

    setEnabled(true);

    setShowSetup(false);

    window.dispatchEvent(new Event("mdp-sync-enabled"));

    setBusy(true);

    const result = await pullFromCloud(code);

    setBusy(false);

    if (result.empty) setHint("Включено. Сначала загрузите данные с ПК (Up).");

    else if (result.pulled) window.location.reload();

    else setHint("Синхронизация включена.");

  }, []);



  const runPull = React.useCallback(async () => {

    const syncKey = key();

    if (!syncKey) return;

    setBusy(true);

    const r = await pullFromCloud(syncKey);

    setBusy(false);

    if (r.pulled) window.location.reload();

    else {

      setHint(r.empty ? "В облаке пусто" : "Готово");

      void refreshDiagnostics();

    }

  }, [refreshDiagnostics]);



  const runPush = React.useCallback(async () => {
    const syncKey = key();
    if (!syncKey) return;
    setBusy(true);
    const result = await pushToServerDetailed(syncKey);
    setBusy(false);
    if (result.ok && result.payload.updatedAt) {
      setHint(`Загружено · ${formatSyncTime(result.payload.updatedAt)}`);
      void refreshDiagnostics();
    } else {
      setHint(result.ok ? "Не удалось загрузить" : result.reason);
    }
  }, [refreshDiagnostics]);



  const runFullSync = React.useCallback(async () => {

    const syncKey = key();

    if (!syncKey) return;

    setBusy(true);

    const r = await runCloudSync(syncKey);

    setBusy(false);

    if (r.authFailed) setHint("Неверный sync-код");

    else {

      setHint(r.pushed ? "Синхронизировано" : "Скачано (без отправки)");

      void refreshDiagnostics();

      if (r.pulled) window.location.reload();

    }

  }, [refreshDiagnostics]);



  if (collapsed) {

    return (

      <>

        {showSetup && (

          <SyncKeySetup onSaved={(k) => void onKeySaved(k)} onCancel={() => setShowSetup(false)} />

        )}

        <Button

          type="button"

          variant="ghost"

          size="icon"

          title={enabled ? "Cloud sync on" : "Enable cloud sync"}

          onClick={() => (enabled ? void runFullSync() : setShowSetup(true))}

        >

          <Cloud className={cn("size-4", enabled && "text-green-600")} />

        </Button>

      </>

    );

  }



  const localMeta = getLocalSyncMeta().updatedAt;



  return (

    <>

      {showSetup && (

        <SyncKeySetup onSaved={(k) => void onKeySaved(k)} onCancel={() => setShowSetup(false)} />

      )}

      <div className="space-y-2 border-t px-3 py-3">

        <div className="flex items-center gap-2 text-xs text-muted-foreground">

          <Cloud className="size-3.5" />

          Синхронизация телефон ↔ ПК

          {enabled && <span className="text-green-600">· вкл</span>}

          {cloud ? (

            <span className="text-green-600">· облако</span>

          ) : (

            <span className="text-amber-600">· только этот ПК</span>

          )}

        </div>



        {!cloud && (
          <p className="text-[10px] leading-snug text-amber-700 dark:text-amber-300">
            <strong>Up на этом адресе не попадёт на телефон с Vercel.</strong> Либо открой на ПК тот же
            Vercel URL, что и на телефоне, либо выполни{" "}
            <code className="text-[9px]">npm run sync:env</code> и перезапусти dev — тогда Up пойдёт в
            общее Redis-облако.
          </p>
        )}

        {enabled && typeof window !== "undefined" && (
          <p className="text-[10px] text-muted-foreground">
            Сайт: {window.location.host}
          </p>
        )}



        {!enabled ? (

          <Button type="button" size="sm" className="h-8 w-full" onClick={() => setShowSetup(true)}>

            Включить sync

          </Button>

        ) : (

          <div className="flex gap-1">

            <Button

              type="button"

              variant="outline"

              size="sm"

              className="h-8 flex-1 gap-1"

              disabled={busy}

              title="Скачать из облака"

              onClick={() => void runPull()}

            >

              <Download className="size-3" />

              Down

            </Button>

            <Button

              type="button"

              variant="outline"

              size="sm"

              className="h-8 flex-1 gap-1"

              disabled={busy}

              title="Загрузить в облако"

              onClick={() => void runPush()}

            >

              <Upload className="size-3" />

              Up

            </Button>

          </div>

        )}



        {enabled && localDiag && (

          <div className="space-y-0.5 text-[10px] leading-snug text-muted-foreground">

            <p>

              <span className="font-medium text-foreground">Здесь:</span>{" "}

              {localDiag.scheduleEvents} событий ({localDiag.rizeEvents} Rize), до{" "}

              {localDiag.latestEventDay ?? "—"} · English {localDiag.englishDays} дн.

              {localDiag.englishAvg != null ? ` · avg ${localDiag.englishAvg}%` : ""}

            </p>

            {cloudDiag && (

              <p>

                <span className="font-medium text-foreground">Облако:</span>{" "}

                {cloudDiag.scheduleEvents} событий ({cloudDiag.rizeEvents} Rize), до{" "}

                {cloudDiag.latestEventDay ?? "—"} · English {cloudDiag.englishDays} дн.

                {cloudDiag.englishAvg != null ? ` · avg ${cloudDiag.englishAvg}%` : ""}

                <br />

                обновлено: {formatSyncTime(cloudDiag.cloudUpdatedAt)}

              </p>

            )}

            <p>локально отправлено: {formatSyncTime(localMeta)}</p>

            {cloudDiag &&

              localDiag.latestEventDay &&

              cloudDiag.latestEventDay &&

              localDiag.latestEventDay > cloudDiag.latestEventDay && (

                <p className="text-amber-700 dark:text-amber-300">

                  На этом устройстве календарь новее облака — нажмите Up.

                </p>

              )}

            {cloudDiag &&

              localDiag.englishAvg != null &&

              cloudDiag.englishAvg != null &&

              localDiag.englishAvg !== cloudDiag.englishAvg && (

                <p className="text-amber-700 dark:text-amber-300">

                  English отличается — нажмите Down на одном устройстве, Up на другом.

                </p>

              )}

          </div>

        )}



        {enabled && (

          <button

            type="button"

            className="text-[10px] text-muted-foreground underline"

            onClick={() => {

              disableSync();

              setEnabled(false);

              setHint("Sync выключен");

            }}

          >

            Выключить

          </button>

        )}

        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}

      </div>

    </>

  );

}


