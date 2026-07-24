import { describe, expect, it } from "vitest";
import type { EnglishDayRecord } from "@/types";
import {
  finalizeEnglishState,
  mergeEnglishPersistBlobs,
  mergeEnglishPersistStates,
  type EnglishPersistState,
} from "./englishBlobMerge";

function wrap(state: EnglishPersistState, version = 4): string {
  return JSON.stringify({ state, version });
}

function day(dateKey: string, finalScore: number, completedAt?: string): EnglishDayRecord {
  return {
    id: `day_${dateKey}`,
    dateKey,
    wordIds: Array.from({ length: 10 }, (_, i) => `w${i}`),
    finalScore,
    completedAt: completedAt ?? `${dateKey}T12:00:00.000Z`,
  };
}

const baseState = (): EnglishPersistState => ({
  settings: {
    dailyWordCount: 10,
    dropPoolSize: 20,
    focusCategories: ["everyday"],
    level: "B1-B2",
  },
  vocabulary: [],
  favoriteWordIds: [],
  activeSession: null,
  srs: {},
  history: [],
  stats: {
    streak: 0,
    totalWordsLearned: 0,
    totalSessionsCompleted: 0,
    averageScore: 0,
  },
});

describe("mergeEnglishPersistStates", () => {
  it("keeps the newer history entry for the same day", () => {
    const local = {
      ...baseState(),
      history: [day("2026-07-07", 70, "2026-07-07T10:00:00.000Z")],
      stats: {
        streak: 1,
        lastStudyDate: "2026-07-07",
        totalWordsLearned: 10,
        totalSessionsCompleted: 1,
        averageScore: 70,
      },
    };
    const remote = {
      ...baseState(),
      history: [day("2026-07-07", 93, "2026-07-07T12:00:00.000Z")],
      stats: {
        streak: 1,
        lastStudyDate: "2026-07-07",
        totalWordsLearned: 10,
        totalSessionsCompleted: 1,
        averageScore: 93,
      },
    };

    const merged = mergeEnglishPersistStates(local, remote);
    expect(merged.history.find((h) => h.dateKey === "2026-07-07")?.finalScore).toBe(93);
    expect(merged.stats.averageScore).toBe(64);
    expect(merged.stats.totalSessionsCompleted).toBe(3);
  });

  it("merges history across devices and recomputes average score", () => {
    const local = {
      ...baseState(),
      history: [
        day("2026-07-07", 93),
        day("2026-07-06", 80),
      ],
    };
    const remote = {
      ...baseState(),
      history: [
        day("2026-07-05", 50, "2026-07-05T12:00:00.000Z"),
        day("2026-07-04", 60, "2026-07-04T12:00:00.000Z"),
      ],
    };

    const merged = mergeEnglishPersistStates(local, remote);
    expect(merged.history.map((h) => h.dateKey).sort()).toEqual([
      "2026-07-04",
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
    ]);
    expect(merged.stats.averageScore).toBe(71);
    expect(merged.stats.totalSessionsCompleted).toBe(4);
  });

  it("prefers completed active session over in-progress for the same day", () => {
    const local = {
      ...baseState(),
      activeSession: {
        id: "sess_local",
        dateKey: "2026-07-07",
        dropWordIds: [],
        selectedWordIds: ["w1"],
        phase: "quiz" as const,
        flashcardIndex: 1,
        flashcardResults: {},
        matchingCorrect: 2,
        matchingDone: true,
        quizProgress: 1,
        quizCorrect: 1,
        reviewAnswers: {},
      },
    };
    const remote = {
      ...baseState(),
      activeSession: {
        id: "sess_remote",
        dateKey: "2026-07-07",
        dropWordIds: [],
        selectedWordIds: ["w1"],
        phase: "complete" as const,
        flashcardIndex: 1,
        flashcardResults: {},
        matchingCorrect: 10,
        matchingDone: true,
        quizProgress: 10,
        quizCorrect: 9,
        reviewAnswers: {},
        finalScore: 93,
      },
    };

    const merged = mergeEnglishPersistStates(local, remote);
    expect(merged.activeSession?.phase).toBe("complete");
    expect(merged.activeSession?.finalScore).toBe(93);
  });
});

describe("mergeEnglishPersistBlobs", () => {
  it("merges blobs even when the smaller blob would have won by size", () => {
    const olderBigger = wrap({
      ...baseState(),
      vocabulary: Array.from({ length: 30 }, (_, i) => ({
        id: `word_${i}`,
        term: `term_${i}`,
        translationRu: `ru_${i}`,
        definition: "x".repeat(80),
        example: "y".repeat(80),
        category: "everyday" as const,
        difficulty: "B1" as const,
        createdAt: "2026-07-01T00:00:00.000Z",
      })),
      history: [day("2026-07-07", 70, "2026-07-07T10:00:00.000Z")],
      stats: {
        streak: 1,
        lastStudyDate: "2026-07-07",
        totalWordsLearned: 10,
        totalSessionsCompleted: 1,
        averageScore: 70,
      },
    });

    const newerSmaller = wrap({
      ...baseState(),
      history: [day("2026-07-07", 93, "2026-07-07T12:00:00.000Z")],
      stats: {
        streak: 1,
        lastStudyDate: "2026-07-07",
        totalWordsLearned: 10,
        totalSessionsCompleted: 1,
        averageScore: 93,
      },
    });

    expect(newerSmaller.length).toBeLessThan(olderBigger.length);

    const mergedRaw = mergeEnglishPersistBlobs(olderBigger, newerSmaller);
    const merged = JSON.parse(mergedRaw) as { state: EnglishPersistState };

    expect(merged.state.history.find((h) => h.dateKey === "2026-07-07")?.finalScore).toBe(93);
    expect(merged.state.stats.averageScore).toBe(64);
    expect(merged.state.vocabulary).toHaveLength(30);
  });
});

describe("finalizeEnglishState", () => {
  it("recomputes stats from history when stats drift", () => {
    const state = {
      ...baseState(),
      history: [day("2026-07-07", 93), day("2026-07-06", 80)],
      stats: {
        streak: 1,
        lastStudyDate: "2026-07-07",
        totalWordsLearned: 10,
        totalSessionsCompleted: 1,
        averageScore: 70,
      },
    };

    const reconciled = finalizeEnglishState(state);
    expect(reconciled.stats.averageScore).toBe(74);
    expect(reconciled.stats.totalSessionsCompleted).toBe(3);
  });
});
