"use client";

import * as React from "react";
import { isSyncEnabled, getStoredSyncKey, setLocalSyncMeta } from "@/lib/sync/syncAuthClient";
import { pushToServer, syncOnAppLoad, syncOnVisible } from "@/lib/sync/syncRunner";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { useCookingStore } from "@/stores/cookingStore";
import { useCareerStore } from "@/stores/careerStore";
import { useEnglishStore } from "@/stores/englishStore";

const SYNC_TIMEOUT_MS = 12000;
const PUSH_DEBOUNCE_MS = 600;

export function SyncGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const pushTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const protectionRan = React.useRef(false);
  const syncKeyRef = React.useRef<string | null>(null);
  const bootSyncDoneRef = React.useRef(false);

  const flushPush = React.useCallback(() => {
    if (!bootSyncDoneRef.current) return;
    if (!isSyncEnabled()) return;
    const key = syncKeyRef.current ?? getStoredSyncKey();
    if (!key) return;
    void pushToServer(key).then((saved) => {
      if (saved?.updatedAt) setLocalSyncMeta(saved.updatedAt);
    });
  }, []);

  const pullSync = React.useCallback(async () => {
    if (!bootSyncDoneRef.current) return;
    if (!isSyncEnabled()) return;
    const key = syncKeyRef.current ?? getStoredSyncKey();
    if (!key) return;
    await syncOnVisible(key);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    if (!protectionRan.current) {
      protectionRan.current = true;
      useScheduleStore.getState().runProtectionCheck();
      useProgressStore.getState().runProtectionCheck();
    }

    syncKeyRef.current = getStoredSyncKey();

    const boot = async () => {
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
      if (isSyncEnabled() && syncKeyRef.current) {
        await syncOnAppLoad(syncKeyRef.current);
      }
      bootSyncDoneRef.current = true;
      if (!cancelled) setReady(true);
    };

    const fallback = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, SYNC_TIMEOUT_MS + 500);

    void boot().finally(() => clearTimeout(fallback));

    const schedulePush = () => {
      if (!isSyncEnabled()) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(flushPush, PUSH_DEBOUNCE_MS);
    };

    const unsubs = [
      useScheduleStore.subscribe(schedulePush),
      useProgressStore.subscribe(schedulePush),
      useMemoryStore.subscribe(schedulePush),
      useCookingStore.subscribe(schedulePush),
      useCareerStore.subscribe(schedulePush),
      useEnglishStore.subscribe(schedulePush),
    ];

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        flushPush();
      } else if (document.visibilityState === "visible") {
        void pullSync();
      }
    };

    const onPageHide = () => flushPush();
    const onSyncEnabled = () => {
      syncKeyRef.current = getStoredSyncKey();
      void pullSync();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("mdp-sync-enabled", onSyncEnabled);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      unsubs.forEach((u) => u());
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("mdp-sync-enabled", onSyncEnabled);
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [flushPush, pullSync]);

  if (!ready) {
    return (
      <div className="flex h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
