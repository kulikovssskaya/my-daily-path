import { computeStatsFromHistory } from "@/lib/englishStats";
import { todayDateKey } from "@/lib/englishSrs";
import type { EnglishDayRecord, EnglishDailySession, EnglishStats, EnglishVocabWord } from "@/types";

/** Restored after data loss — Jul 5–6 2026 at ~50% to preserve streak. */
export const ENGLISH_BACKFILL_DAYS = [
  { dateKey: "2026-07-05", finalScore: 50 },
  { dateKey: "2026-07-06", finalScore: 50 },
] as const;

export function buildBackfillRecords(
  existing: EnglishDayRecord[],
  vocabulary: EnglishVocabWord[]
): EnglishDayRecord[] {
  const added: EnglishDayRecord[] = [];

  for (const day of ENGLISH_BACKFILL_DAYS) {
    if (existing.some((h) => h.dateKey === day.dateKey)) continue;

    const wordIds =
      vocabulary.length >= 10
        ? vocabulary.slice(0, 10).map((w) => w.id)
        : Array.from({ length: 10 }, (_, i) => `restored_${day.dateKey}_${i}`);

    added.push({
      id: `restored_${day.dateKey}`,
      dateKey: day.dateKey,
      wordIds,
      finalScore: day.finalScore,
      completedAt: `${day.dateKey}T18:00:00.000Z`,
    });
  }

  return added;
}

function pickBetterHistoryRecord(
  a: EnglishDayRecord,
  b: EnglishDayRecord
): EnglishDayRecord {
  const aTime = new Date(a.completedAt).getTime();
  const bTime = new Date(b.completedAt).getTime();
  if (aTime !== bTime) return aTime > bTime ? a : b;
  return a.finalScore >= b.finalScore ? a : b;
}

function shouldRealignHistoryRecord(record: EnglishDayRecord): boolean {
  if (record.id.startsWith("restored_")) return false;
  const completionDay = todayDateKey(new Date(record.completedAt));
  if (completionDay === record.dateKey) return false;

  const stored = new Date(`${record.dateKey}T12:00:00`);
  const completed = new Date(`${completionDay}T12:00:00`);
  const diffDays = Math.round(
    (completed.getTime() - stored.getTime()) / 86_400_000
  );
  // Session started on dateKey but was completed the next calendar day.
  return diffDays === 1;
}

/** Move history entries completed the next day to their real completion date. */
export function alignHistoryToCompletionDates<T extends {
  history: EnglishDayRecord[];
  stats: EnglishStats;
  vocabulary: EnglishVocabWord[];
}>(state: T): T {
  if (state.history.length === 0) return state;

  const byDate = new Map<string, EnglishDayRecord>();
  for (const record of state.history) {
    const shouldAlign = shouldRealignHistoryRecord(record);
    const dateKey = shouldAlign
      ? todayDateKey(new Date(record.completedAt))
      : record.dateKey;
    const aligned = shouldAlign ? { ...record, dateKey } : record;
    const existing = byDate.get(dateKey);
    byDate.set(
      dateKey,
      existing ? pickBetterHistoryRecord(aligned, existing) : aligned
    );
  }

  const history = [...byDate.values()].sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey)
  );

  return {
    ...state,
    history,
    stats: computeStatsFromHistory(history, state.vocabulary),
  };
}

/** Restore history when a completed session was not persisted (e.g. sync/date patch). */
export function recoverCompletedSessionHistory<T extends {
  history: EnglishDayRecord[];
  activeSession: EnglishDailySession | null;
  vocabulary: EnglishVocabWord[];
  stats: EnglishStats;
}>(state: T): T {
  const session = state.activeSession;
  if (!session || session.phase !== "complete" || session.finalScore == null) {
    return state;
  }

  const dateKey = session.completedAt
    ? todayDateKey(new Date(session.completedAt))
    : todayDateKey();

  const existing = state.history.find((h) => h.dateKey === dateKey);
  const sessionTime = new Date(session.completedAt ?? 0).getTime();
  if (existing) {
    const existingTime = new Date(existing.completedAt).getTime();
    if (
      sessionTime <= existingTime &&
      session.finalScore <= existing.finalScore
    ) {
      return state;
    }
  }

  const record: EnglishDayRecord = {
    id: `recovered_${dateKey}_${session.id}`,
    dateKey,
    wordIds: session.selectedWordIds,
    finalScore: session.finalScore,
    completedAt: session.completedAt ?? new Date().toISOString(),
  };

  const history = [
    record,
    ...state.history.filter((h) => h.dateKey !== dateKey),
  ].slice(0, 120);

  return {
    ...state,
    history,
    stats: computeStatsFromHistory(history, state.vocabulary),
  };
}

export function shouldApplyEnglishHistoryBackfill(state: {
  history: EnglishDayRecord[];
  vocabulary: EnglishVocabWord[];
  stats: EnglishStats;
}): boolean {
  return (
    state.history.length > 0 ||
    state.stats.totalSessionsCompleted > 0 ||
    state.vocabulary.length >= 5
  );
}

export function applyEnglishHistoryBackfill<T extends {
  history: EnglishDayRecord[];
  stats: EnglishStats;
  vocabulary: EnglishVocabWord[];
}>(state: T): T {
  if (!shouldApplyEnglishHistoryBackfill(state)) return state;
  const added = buildBackfillRecords(state.history, state.vocabulary);
  if (added.length === 0) return state;

  const history = [...added, ...state.history].sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey)
  );

  return {
    ...state,
    history,
    stats: computeStatsFromHistory(history, state.vocabulary),
  };
}
