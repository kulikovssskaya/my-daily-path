import { describe, expect, it } from "vitest";
import {
  applyEnglishHistoryDateFixes,
  computeStatsFromHistory,
  hasEnglishDateKey,
  shiftEnglishDateKey,
} from "./englishStats";
import type { EnglishDayRecord } from "@/types";

const day = (dateKey: string, finalScore: number): EnglishDayRecord => ({
  id: `day_${dateKey}`,
  dateKey,
  wordIds: Array.from({ length: 10 }, (_, i) => `w${i}`),
  finalScore,
  completedAt: `${dateKey}T12:00:00.000Z`,
});

describe("englishStats", () => {
  it("computes streak from consecutive study days", () => {
    const stats = computeStatsFromHistory([
      day("2026-07-02", 60),
      day("2026-07-03", 20),
      day("2026-07-04", 70),
    ]);
    expect(stats.streak).toBe(3);
    expect(stats.lastStudyDate).toBe("2026-07-04");
    expect(stats.totalSessionsCompleted).toBe(3);
    expect(stats.totalWordsLearned).toBe(10);
    expect(stats.averageScore).toBe(50);
  });

  it("shifts a date key and recalculates stats", () => {
    const history = [
      day("2026-07-06", 80),
      day("2026-07-04", 70),
      day("2026-07-03", 20),
      day("2026-07-02", 60),
    ];
    const shifted = shiftEnglishDateKey(
      {
        history,
        stats: {
          streak: 1,
          lastStudyDate: "2026-07-06",
          totalWordsLearned: 40,
          totalSessionsCompleted: 4,
          averageScore: 58,
        },
        activeSession: null,
      },
      "2026-07-06",
      "2026-07-05"
    );

    expect(shifted.history.map((h) => h.dateKey)).toEqual([
      "2026-07-05",
      "2026-07-04",
      "2026-07-03",
      "2026-07-02",
    ]);
    expect(shifted.stats.streak).toBe(4);
    expect(shifted.stats.lastStudyDate).toBe("2026-07-05");
    expect(shifted.stats.averageScore).toBe(58);
  });

  it("detects whether a date key is present", () => {
    expect(
      hasEnglishDateKey(
        {
          history: [day("2026-07-04", 70)],
          stats: { streak: 1, lastStudyDate: "2026-07-04", totalWordsLearned: 10, totalSessionsCompleted: 1, averageScore: 70 },
          activeSession: null,
        },
        "2026-07-06"
      )
    ).toBe(false);
  });

  it("moves 2026-07-12 to 2026-07-11 and recalculates stats", () => {
    const patched = applyEnglishHistoryDateFixes({
      history: [day("2026-07-12", 60), day("2026-07-10", 80)],
      stats: {
        streak: 1,
        lastStudyDate: "2026-07-12",
        totalWordsLearned: 20,
        totalSessionsCompleted: 2,
        averageScore: 70,
      },
      activeSession: null,
    });

    expect(patched.history.map((h) => h.dateKey)).toEqual(["2026-07-11", "2026-07-10"]);
    expect(patched.history[0]?.finalScore).toBe(60);
    expect(patched.stats.lastStudyDate).toBe("2026-07-11");
    expect(patched.stats.streak).toBe(2);
    expect(patched.stats.averageScore).toBe(70);
    expect(patched.stats.totalWordsLearned).toBe(10);
  });

  it("counts unique terms when the same words repeat across sessions", () => {
    const shared = Array.from({ length: 10 }, (_, i) => `w${i}`);
    const vocabulary = shared.map((id, i) => ({ id, term: `term-${i}` }));
    const stats = computeStatsFromHistory(
      [
        { ...day("2026-07-01", 60), wordIds: shared },
        { ...day("2026-07-02", 70), wordIds: shared },
      ],
      vocabulary
    );
    expect(stats.totalWordsLearned).toBe(10);
  });

  it("deduplicates by term even when ids differ", () => {
    const stats = computeStatsFromHistory(
      [
        {
          ...day("2026-07-01", 60),
          wordIds: ["w1", "w2"],
        },
      ],
      [
        { id: "w1", term: "deploy" },
        { id: "w2", term: "Deploy" },
      ]
    );
    expect(stats.totalWordsLearned).toBe(1);
  });
});
