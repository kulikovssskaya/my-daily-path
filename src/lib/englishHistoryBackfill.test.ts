import { describe, expect, it } from "vitest";
import {
  alignHistoryToCompletionDates,
  applyEnglishHistoryBackfill,
  buildBackfillRecords,
  recoverCompletedSessionHistory,
  shouldApplyEnglishHistoryBackfill,
} from "@/lib/englishHistoryBackfill";
import { computeStatsFromHistory } from "@/lib/englishStats";

describe("englishHistoryBackfill", () => {
  it("adds Jul 5–6 2026 at 50% when missing", () => {
    const added = buildBackfillRecords([], []);
    expect(added.map((r) => r.dateKey)).toEqual(["2026-07-05", "2026-07-06"]);
    expect(added.every((r) => r.finalScore === 50)).toBe(true);
  });

  it("does not backfill on fresh install", () => {
    const empty = {
      history: [],
      stats: {
        streak: 0,
        totalWordsLearned: 0,
        totalSessionsCompleted: 0,
        averageScore: 0,
      },
      vocabulary: [],
    };
    expect(shouldApplyEnglishHistoryBackfill(empty)).toBe(false);
    expect(applyEnglishHistoryBackfill(empty).history).toHaveLength(0);
  });

  it("skips dates already in history", () => {
    const existing = [
      {
        id: "day_1",
        dateKey: "2026-07-05",
        wordIds: ["w1"],
        finalScore: 80,
        completedAt: "2026-07-05T12:00:00.000Z",
      },
    ];
    const added = buildBackfillRecords(existing, []);
    expect(added.map((r) => r.dateKey)).toEqual(["2026-07-06"]);
  });

  it("extends streak through restored days", () => {
    const history = [
      {
        id: "day_today",
        dateKey: "2026-07-07",
        wordIds: Array.from({ length: 10 }, (_, i) => `w${i}`),
        finalScore: 70,
        completedAt: "2026-07-07T12:00:00.000Z",
      },
    ];
    const patched = applyEnglishHistoryBackfill({
      history,
      stats: computeStatsFromHistory(history),
      vocabulary: [],
    });
    expect(patched.history.map((h) => h.dateKey).sort()).toEqual([
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
    ]);
    expect(patched.stats.streak).toBe(3);
  });

  it("recovers a completed session into history when missing", () => {
    const recovered = recoverCompletedSessionHistory({
      history: [{ id: "old", dateKey: "2026-07-11", wordIds: ["w0"], finalScore: 60, completedAt: "2026-07-11T12:00:00.000Z" }],
      stats: computeStatsFromHistory([{ id: "old", dateKey: "2026-07-11", wordIds: ["w0"], finalScore: 60, completedAt: "2026-07-11T12:00:00.000Z" }]),
      vocabulary: [{ id: "w1", term: "deploy", translationRu: "x", definition: "x", example: "x", category: "it", difficulty: "B1", createdAt: "2026-07-12T12:00:00.000Z" }],
      activeSession: {
        id: "sess_1",
        dateKey: "2026-07-11",
        dropWordIds: [],
        selectedWordIds: ["w1"],
        phase: "complete",
        flashcardIndex: 10,
        flashcardResults: {},
        matchingCorrect: 10,
        matchingDone: true,
        quizProgress: 10,
        quizCorrect: 8,
        reviewAnswers: { w1: true },
        finalScore: 80,
        completedAt: "2026-07-12T15:00:00.000Z",
      },
    });

    expect(recovered.history.some((h) => h.dateKey === "2026-07-12" && h.finalScore === 80)).toBe(true);
  });

  it("aligns history dateKey to the local completion date", () => {
    const aligned = alignHistoryToCompletionDates({
      history: [
        {
          id: "wrong_day",
          dateKey: "2026-07-11",
          wordIds: ["w1"],
          finalScore: 80,
          completedAt: "2026-07-12T15:00:00.000Z",
        },
      ],
      stats: computeStatsFromHistory([
        {
          id: "wrong_day",
          dateKey: "2026-07-11",
          wordIds: ["w1"],
          finalScore: 80,
          completedAt: "2026-07-12T15:00:00.000Z",
        },
      ]),
      vocabulary: [{ id: "w1", term: "deploy", translationRu: "x", definition: "x", example: "x", category: "it", difficulty: "B1", createdAt: "2026-07-12T12:00:00.000Z" }],
    });

    expect(aligned.history[0]?.dateKey).toBe("2026-07-12");
    expect(aligned.history[0]?.finalScore).toBe(80);
  });
});
