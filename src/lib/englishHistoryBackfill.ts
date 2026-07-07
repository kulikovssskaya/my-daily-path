import { computeStatsFromHistory } from "@/lib/englishStats";
import type { EnglishDayRecord, EnglishStats, EnglishVocabWord } from "@/types";

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
    stats: computeStatsFromHistory(history),
  };
}
