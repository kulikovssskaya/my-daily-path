import { describe, expect, it } from "vitest";
import { sanitizePlanEvents, todayKeyFromIso } from "@/lib/planSafety";

describe("sanitizePlanEvents", () => {
  it("drops events before today", () => {
    const now = "2026-07-02T12:00:00";
    const result = sanitizePlanEvents(
      [
        { title: "Old", category: "learning", start: "2026-07-01T09:00:00", end: "2026-07-01T10:00:00" },
        { title: "Today", category: "learning", start: "2026-07-02T09:00:00", end: "2026-07-02T10:00:00" },
      ],
      now
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe("Today");
    expect(result.droppedPast).toBe(1);
    expect(result.blocked).toBe(false);
  });

  it("blocks when all events are in the past", () => {
    const result = sanitizePlanEvents(
      [{ title: "Old", category: "learning", start: "2026-06-01T09:00:00", end: "2026-06-01T10:00:00" }],
      "2026-07-02T12:00:00"
    );
    expect(result.blocked).toBe(true);
  });
});

describe("todayKeyFromIso", () => {
  it("reads date from naive ISO", () => {
    expect(todayKeyFromIso("2026-07-02T15:30:00")).toBe("2026-07-02");
  });
});
