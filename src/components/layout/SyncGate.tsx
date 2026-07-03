"use client";

import * as React from "react";
import {
  applyBlobsToLocal,
  collectLocalBlobs,
  hasLocalData,
  type SyncPayload,
} from "@/lib/sync/client";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { useCookingStore } from "@/stores/cookingStore";
import { useCareerStore } from "@/stores/careerStore";
import { useTimerStore } from "@/stores/timerStore";
import { useEnglishStore } from "@/stores/englishStore";

const SYNC_TIMEOUT_MS = 4000;

function rehydrateAllStores() {
  useScheduleStore.persist.rehydrate();
  useProgressStore.persist.rehydrate();
  useMemoryStore.persist.rehydrate();
  useCookingStore.persist.rehydrate();
  useCareerStore.persist.rehydrate();
  useTimerStore.persist.rehydrate();
  useEnglishStore.persist.rehydrate();
}

async function fetchServerState(): Promise<SyncPayload | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    const res = await fetch("/api/sync", { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as SyncPayload;
    return data.updatedAt ? data : null;
  } catch {
    return null;
  }
}

async function pushToServer() {
  const blobs = collectLocalBlobs();
  if (Object.keys(blobs).length === 0) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blobs }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // offline or slow — local data still works
  }
}

export function SyncGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const pushTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const protectionRan = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;

    if (!protectionRan.current) {
      protectionRan.current = true;
      useScheduleStore.getState().runProtectionCheck();
      useProgressStore.getState().runProtectionCheck();
    }

    const boot = async () => {
      const deadline = Date.now() + SYNC_TIMEOUT_MS;
      const server = await fetchServerState();

      if (server?.blobs && Object.keys(server.blobs).length > 0) {
        applyBlobsToLocal(server.blobs);
        rehydrateAllStores();
      } else if (hasLocalData() && Date.now() < deadline) {
        await pushToServer();
      }

      if (!cancelled) setReady(true);
    };

    const fallback = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, SYNC_TIMEOUT_MS + 500);

    void boot().finally(() => clearTimeout(fallback));

    const schedulePush = () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => void pushToServer(), 1500);
    };

    const unsubs = [
      useScheduleStore.subscribe(schedulePush),
      useProgressStore.subscribe(schedulePush),
      useMemoryStore.subscribe(schedulePush),
      useCookingStore.subscribe(schedulePush),
      useCareerStore.subscribe(schedulePush),
      useTimerStore.subscribe(schedulePush),
      useEnglishStore.subscribe(schedulePush),
    ];

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void (async () => {
          const server = await fetchServerState();
          if (server?.blobs) {
            applyBlobsToLocal(server.blobs);
            rehydrateAllStores();
          }
        })();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      unsubs.forEach((u) => u());
      document.removeEventListener("visibilitychange", onVis);
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
