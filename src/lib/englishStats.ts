import type { EnglishDayRecord, EnglishDailySession, EnglishStats } from "@/types";

export function computeStatsFromHistory(history: EnglishDayRecord[]): EnglishStats {
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
  const totalWordsLearned = history.reduce((sum, h) => sum + h.wordIds.length, 0);
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
