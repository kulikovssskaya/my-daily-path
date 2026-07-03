import { describe, expect, it } from "vitest";
import {
  sessionDurationMin,
  sessionDurationMs,
  MIN_TIMER_SESSION_MS,
} from "@/lib/timerSessions";
import type { TimerSession } from "@/types";

const base: TimerSession = {
  id: "s1",
  title: "Python",
  category: "learning",
  track: "Python",
  kind: "stopwatch",
  startedAt: 1_000_000,
  endedAt: 1_000_000 + 90 * 60_000,
  savedToCalendar: false,
};

describe("timerSessions", () => {
  it("computes duration in ms", () => {
    expect(sessionDurationMs(base)).toBe(90 * 60_000);
  });

  it("computes duration in minutes (min 1)", () => {
    expect(sessionDurationMin(base)).toBe(90);
    expect(sessionDurationMin({ ...base, endedAt: base.startedAt + 30_000 })).toBe(1);
  });

  it("uses now for running sessions", () => {
    const running = { ...base, endedAt: null };
    expect(sessionDurationMs(running, base.startedAt + 5 * 60_000)).toBe(5 * 60_000);
  });

  it("exports sensible minimum", () => {
    expect(MIN_TIMER_SESSION_MS).toBe(60_000);
  });
});
