import type { EnglishDayRecord, EnglishDailySession, EnglishStats, EnglishVocabWord } from "@/types";

export function countUniqueStudiedWords(
  history: EnglishDayRecord[],
  vocabulary: Pick<EnglishVocabWord, "id" | "term">[] = []
): number {
  const studiedIds = new Set(history.flatMap((h) => h.wordIds));
  const termById = new Map(vocabulary.map((w) => [w.id, w.term]));
  const uniqueTerms = new Set<string>();

  for (const id of studiedIds) {
    const term = termById.get(id)?.trim().toLowerCase();
    uniqueTerms.add(term || id);
  }

  return uniqueTerms.size;
}

export function computeStatsFromHistory(
  history: EnglishDayRecord[],
  vocabulary: Pick<EnglishVocabWord, "id" | "term">[] = []
): EnglishStats {
  if (history.length === 0) {
    return {
      streak: 0,
      totalWordsLearned: 0,
      totalSessionsCompleted: 0,
      averageScore: 0,
    };
  }

  const dates = [...new Set(history.map((h) => h.dateKey))].sort();
  let streak = 1;
  const lastStudyDate = dates[dates.length - 1];

  for (let i = dates.length - 1; i > 0; i--) {
    const cur = new Date(`${dates[i]}T12:00:00`);
    const prev = new Date(`${dates[i - 1]}T12:00:00`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) streak++;
    else break;
  }

  const totalSessionsCompleted = history.length;
  const totalWordsLearned = countUniqueStudiedWords(history, vocabulary);
  const averageScore = Math.round(
    history.reduce((sum, h) => sum + h.finalScore, 0) / totalSessionsCompleted
  );

  return { streak, lastStudyDate, totalWordsLearned, totalSessionsCompleted, averageScore };
}

export interface EnglishDatePatchSlice {
  history: EnglishDayRecord[];
  stats: EnglishStats;
  activeSession: EnglishDailySession | null;
}

export function hasEnglishDateKey(
  state: EnglishDatePatchSlice,
  dateKey: string
): boolean {
  return (
    state.history.some((h) => h.dateKey === dateKey) ||
    state.activeSession?.dateKey === dateKey ||
    state.stats.lastStudyDate === dateKey
  );
}

export function shiftEnglishDateKey(
  state: EnglishDatePatchSlice,
  from: string,
  to: string
): EnglishDatePatchSlice {
  const history = state.history.map((h) =>
    h.dateKey === from ? { ...h, dateKey: to } : h
  );
  const activeSession =
    state.activeSession?.dateKey === from
      ? { ...state.activeSession, dateKey: to }
      : state.activeSession;

  return {
    history,
    activeSession,
    stats: computeStatsFromHistory(history),
  };
}

/** One-off history date corrections (applied on load + sync reconcile). */
const ENGLISH_HISTORY_DATE_FIXES = [{ from: "2026-07-12", to: "2026-07-11" }] as const;

function pickBetterHistoryRecord(
  a: EnglishDayRecord,
  b: EnglishDayRecord
): EnglishDayRecord {
  const aTime = new Date(a.completedAt).getTime();
  const bTime = new Date(b.completedAt).getTime();
  if (aTime !== bTime) return aTime > bTime ? a : b;
  return a.finalScore >= b.finalScore ? a : b;
}

export function applyEnglishHistoryDateFixes<T extends EnglishDatePatchSlice>(
  state: T
): T {
  let next: EnglishDatePatchSlice = state;

  for (const { from, to } of ENGLISH_HISTORY_DATE_FIXES) {
    if (!hasEnglishDateKey(next, from)) continue;

    const fromRecord = next.history.find((h) => h.dateKey === from);
    if (!fromRecord) continue;

    const toRecord = next.history.find((h) => h.dateKey === to);
    let history: EnglishDayRecord[];

    if (toRecord) {
      const kept = pickBetterHistoryRecord(
        { ...fromRecord, dateKey: to },
        toRecord
      );
      history = next.history
        .filter((h) => h.dateKey !== from && h.dateKey !== to)
        .concat(kept)
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    } else {
      history = next.history.map((h) =>
        h.dateKey === from ? { ...h, dateKey: to } : h
      );
    }

    next = {
      history,
      activeSession:
        next.activeSession?.dateKey === from
          ? { ...next.activeSession, dateKey: to }
          : next.activeSession,
      stats: computeStatsFromHistory(history),
    };
  }

  return { ...state, ...next };
}
