import { describe, expect, it } from "vitest";
import {
  advanceSRS,
  createInitialSRS,
  isDueForReview,
  updateStreak,
  SRS_INTERVALS_DAYS,
} from "./englishSrs";

describe("englishSrs", () => {
  it("schedules first review in 3 days", () => {
    const srs = createInitialSRS("w1", "deploy");
    const due = new Date(srs.nextReviewAt);
    const now = new Date();
    const diffDays = Math.round((due.getTime() - now.getTime()) / 86_400_000);
    expect(diffDays).toBe(SRS_INTERVALS_DAYS[0]);
  });

  it("advances interval on correct answer", () => {
    const srs = createInitialSRS("w1", "deploy");
    const next = advanceSRS(srs, true);
    expect(next.intervalIndex).toBe(1);
    expect(next.timesCorrect).toBe(1);
  });

  it("resets interval on wrong answer", () => {
    const srs = advanceSRS(createInitialSRS("w1", "deploy"), true);
    const reset = advanceSRS(srs, false);
    expect(reset.intervalIndex).toBe(0);
    expect(reset.timesIncorrect).toBe(1);
  });

  it("marks due when nextReviewAt is in the past", () => {
    const srs = createInitialSRS("w1", "deploy");
    srs.nextReviewAt = new Date(Date.now() - 86_400_000).toISOString();
    expect(isDueForReview(srs)).toBe(true);
  });

  it("extends streak on consecutive days", () => {
    const r = updateStreak(3, "2026-07-01", "2026-07-02");
    expect(r.streak).toBe(4);
  });
});
