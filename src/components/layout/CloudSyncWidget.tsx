"use client";

import * as React from "react";
import { Cloud, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncKeySetup } from "@/components/layout/SyncKeySetup";
import {
  disableSync,
  enableSync,
  getStoredSyncKey,
  isSyncEnabled,
} from "@/lib/sync/syncAuthClient";
import {
  fetchCloudSyncStatus,
  pullFromCloud,
  pushToServerDetailed,
  runCloudSync,
  verifySyncKey,
} from "@/lib/sync/syncRunner";
import { getLocalSyncDiagnostics } from "@/lib/sync/syncStoreFlush";
import { cn } from "@/lib/utils";

function needsUp(
  local: ReturnType<typeof getLocalSyncDiagnostics>,
  cloud: Awaited<ReturnType<typeof fetchCloudSyncStatus>> | null
): boolean {
  if (!cloud?.latestEventDay || !local.latestEventDay) return false;
  return local.latestEventDay > cloud.latestEventDay;
}

export function CloudSyncWidget({ collapsed }: { collapsed?: boolean }) {
  const [cloud, setCloud] = React.useState(false);
  const [enabled, setEnabled] = React.useState(false);
  const [showSetup, setShowSetup] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [showUpHint, setShowUpHint] = React.useState(false);

  React.useEffect(() => {
    setEnabled(isSyncEnabled());
    void fetch("/api/sync/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { cloud?: boolean }) => setCloud(Boolean(d.cloud)))
      .catch(() => setCloud(false));
  }, []);

  React.useEffect(() => {
    const open = () => setShowSetup(true);
    window.addEventListener("mdp-open-sync-setup", open);
    return () => window.removeEventListener("mdp-open-sync-setup", open);
  }, []);

  React.useEffect(() => {
    if (!enabled || !isSyncEnabled()) return;
    const key = getStoredSyncKey();
    if (!key) return;
    void (async () => {
      const local = getLocalSyncDiagnostics();
      const remote = await fetchCloudSyncStatus(key);
      setShowUpHint(needsUp(local, remote));
    })();
  }, [enabled, toast]);

  const syncKey = () => getStoredSyncKey();

  const onKeySaved = React.useCallback(async (code: string) => {
    if (!(await verifySyncKey(code))) {
      setToast("Неверный код");
      return;
    }
    enableSync(code);
    setEnabled(true);
    setShowSetup(false);
    window.dispatchEvent(new Event("mdp-sync-enabled"));
    setBusy(true);
    const result = await pullFromCloud(code);
    setBusy(false);
    if (result.pulled) window.location.reload();
    else setToast(result.empty ? "Сначала Up на ПК" : null);
  }, []);

  const runPull = React.useCallback(async () => {
    const key = syncKey();
    if (!key) return;
    setBusy(true);
    const r = await pullFromCloud(key);
    setBusy(false);
    if (r.authFailed) setToast("Неверный код");
    else if (r.pulled) window.location.reload();
    else setToast(r.empty ? "Сначала Up на ПК" : "OK");
  }, []);

  const runPush = React.useCallback(async () => {
    const key = syncKey();
    if (!key) return;
    setBusy(true);
    const result = await pushToServerDetailed(key);
    setBusy(false);
    if (result.ok) {
      setToast("OK");
      setShowUpHint(false);
    } else {
      setToast(result.ok ? "Ошибка" : result.reason.slice(0, 40));
    }
  }, []);

  const runFullSync = React.useCallback(async () => {
    const key = syncKey();
    if (!key) return;
    setBusy(true);
    const r = await runCloudSync(key);
    setBusy(false);
    if (r.authFailed) setToast("Неверный код");
    else if (r.pulled) window.location.reload();
    else setToast("OK");
  }, []);

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
          title="Sync"
          onClick={() => (enabled ? void runFullSync() : setShowSetup(true))}
        >
          <Cloud className={cn("size-4", enabled && "text-green-600")} />
        </Button>
      </>
    );
  }

  return (
    <>
      {showSetup && (
        <SyncKeySetup onSaved={(k) => void onKeySaved(k)} onCancel={() => setShowSetup(false)} />
      )}
      <div className="border-t px-3 py-2">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Cloud className={cn("size-3", enabled && "text-green-600")} />
            Sync
            {enabled && (
              <span className="text-[10px] opacity-70">
                · {cloud ? "облако" : "локально"}
              </span>
            )}
          </div>
          {enabled && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground underline"
              onClick={() => {
                disableSync();
                setEnabled(false);
                setToast(null);
              }}
            >
              выкл
            </button>
          )}
        </div>

        {!enabled ? (
          <Button
            type="button"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => setShowSetup(true)}
          >
            Включить
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 px-2 text-xs"
              disabled={busy}
              title="Скачать"
              onClick={() => void runPull()}
            >
              <Download className="size-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 px-2 text-xs"
              disabled={busy}
              title="Загрузить"
              onClick={() => void runPush()}
            >
              <Upload className="size-3" />
            </Button>
          </div>
        )}

        {enabled && showUpHint && !toast && (
          <p className="mt-1 text-[10px] text-amber-600">↑ Up</p>
        )}
        {toast && (
          <p className="mt-1 truncate text-[10px] text-muted-foreground">{toast}</p>
        )}
      </div>
    </>
  );
}
