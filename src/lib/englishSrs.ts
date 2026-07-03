import type { EnglishWordSRS } from "@/types";

export const SRS_INTERVALS_DAYS = [3, 7, 14, 30] as const;

export function todayDateKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nextReviewDate(from: Date, intervalIndex: number): string {
  const idx = Math.max(0, Math.min(intervalIndex, SRS_INTERVALS_DAYS.length - 1));
  const days = SRS_INTERVALS_DAYS[idx];
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

export function advanceSRS(current: EnglishWordSRS, correct: boolean): EnglishWordSRS {
  const now = new Date().toISOString();
  if (correct) {
    const newIndex = Math.min(current.intervalIndex + 1, SRS_INTERVALS_DAYS.length - 1);
    const timesCorrect = current.timesCorrect + 1;
    return {
      ...current,
      intervalIndex: newIndex,
      nextReviewAt: nextReviewDate(new Date(), newIndex),
      lastReviewedAt: now,
      timesCorrect,
      mastered: newIndex >= SRS_INTERVALS_DAYS.length - 1 && timesCorrect >= 2,
    };
  }
  return {
    ...current,
    intervalIndex: 0,
    nextReviewAt: nextReviewDate(new Date(), 0),
    lastReviewedAt: now,
    timesIncorrect: current.timesIncorrect + 1,
    mastered: false,
  };
}

export function createInitialSRS(wordId: string, term: string): EnglishWordSRS {
  return {
    wordId,
    term,
    intervalIndex: 0,
    nextReviewAt: nextReviewDate(new Date(), 0),
    timesCorrect: 0,
    timesIncorrect: 0,
    mastered: false,
  };
}

export function isDueForReview(srs: EnglishWordSRS, now = new Date()): boolean {
  return new Date(srs.nextReviewAt).getTime() <= now.getTime();
}

export function updateStreak(
  streak: number,
  lastStudyDate: string | undefined,
  today: string
): { streak: number; lastStudyDate: string } {
  if (lastStudyDate === today) {
    return { streak, lastStudyDate: today };
  }
  if (!lastStudyDate) {
    return { streak: 1, lastStudyDate: today };
  }
  const last = new Date(lastStudyDate + "T12:00:00");
  const cur = new Date(today + "T12:00:00");
  const diffDays = Math.round((cur.getTime() - last.getTime()) / 86_400_000);
  if (diffDays === 1) {
    return { streak: streak + 1, lastStudyDate: today };
  }
  return { streak: 1, lastStudyDate: today };
}

export function scoreRecommendations(score: number, unknownTerms: string[]): string[] {
  const tips: string[] = [];
  if (score >= 90) {
    tips.push("Excellent! Keep your streak and try harder B2 collocations tomorrow.");
  } else if (score >= 70) {
    tips.push("Good progress. Re-read examples for words you missed.");
  } else {
    tips.push("Review flashcards again and add your own examples in context.");
  }
  if (unknownTerms.length > 0) {
    tips.push(`Focus on: ${unknownTerms.slice(0, 5).join(", ")}.`);
  }
  tips.push("Words due for spaced repetition will appear in your review queue.");
  return tips;
}
