import { describe, it, expect } from "vitest";
import { sanitizeActiveTimer } from "@/stores/timerStore";
import type { TimerSession } from "@/types";

describe("sanitizeActiveTimer", () => {
  const running: TimerSession = {
    id: "t1",
    title: "Python",
    category: "learning",
    track: "",
    kind: "stopwatch",
    startedAt: Date.now() - 60_000,
    endedAt: null,
    savedToCalendar: false,
  };

  it("keeps running session", () => {
    expect(sanitizeActiveTimer(running)?.id).toBe("t1");
  });

  it("drops finished session", () => {
    expect(sanitizeActiveTimer({ ...running, endedAt: Date.now() })).toBeNull();
  });
});
