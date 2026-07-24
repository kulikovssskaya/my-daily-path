import { type SyncStorageKey } from "@/lib/sync/client";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useEnglishStore } from "@/stores/englishStore";
import { finalizeEnglishState } from "@/lib/sync/englishBlobMerge";
import { reconcileSchedulePersistBlob } from "@/lib/sync/scheduleBlobMerge";

function readPersistWrapper(key: SyncStorageKey): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(key);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writePersistBlob(key: SyncStorageKey, state: unknown, version?: number) {
  if (typeof window === "undefined") return;
  const wrapper = readPersistWrapper(key);
  const payload: Record<string, unknown> = { ...wrapper, state };
  if (version != null) payload.version = version;
  localStorage.setItem(key, JSON.stringify(payload));
}

/** Write live schedule + English state into localStorage before cloud push. */
export function flushPersistedStoresToLocalStorage() {
  if (typeof window === "undefined") return;

  const schedule = useScheduleStore.getState();
  writePersistBlob("mdp-schedule", {
    events: schedule.events,
    habits: schedule.habits,
  });

  const english = useEnglishStore.getState();
  const finalized = finalizeEnglishState({
    settings: english.settings,
    vocabulary: english.vocabulary,
    favoriteWordIds: english.favoriteWordIds,
    activeSession: english.activeSession,
    srs: english.srs,
    history: english.history,
    stats: english.stats,
  });
  writePersistBlob("mdp-english", finalized, 7);

  const scheduleRaw = localStorage.getItem("mdp-schedule");
  if (scheduleRaw) {
    localStorage.setItem("mdp-schedule", reconcileSchedulePersistBlob(scheduleRaw));
  }
}

export async function rehydrateAllStoresAsync(): Promise<void> {
  const { useProgressStore } = await import("@/stores/progressStore");
  const { useMemoryStore } = await import("@/stores/memoryStore");
  const { useCookingStore } = await import("@/stores/cookingStore");
  const { useCareerStore } = await import("@/stores/careerStore");

  await Promise.all([
    useScheduleStore.persist.rehydrate(),
    useProgressStore.persist.rehydrate(),
    useMemoryStore.persist.rehydrate(),
    useCookingStore.persist.rehydrate(),
    useCareerStore.persist.rehydrate(),
    useEnglishStore.persist.rehydrate(),
  ]);

  useEnglishStore.getState().ensureHistoryBackfill();
}

export function getLocalSyncDiagnostics(): {
  scheduleEvents: number;
  importedEvents: number;
  latestEventDay: string | null;
  englishDays: number;
  englishAvg: number | null;
} {
  const schedule = useScheduleStore.getState();
  const importedEvents = schedule.events.filter((e) => e.meta?.rizeEntryId).length;
  const days = schedule.events.map((e) => e.start.slice(0, 10)).sort();
  const english = useEnglishStore.getState();

  return {
    scheduleEvents: schedule.events.length,
    importedEvents,
    latestEventDay: days.length > 0 ? days[days.length - 1]! : null,
    englishDays: english.history.length,
    englishAvg:
      english.stats.totalSessionsCompleted > 0 ? english.stats.averageScore : null,
  };
}
