import { describe, it, expect } from "vitest";
import {
  dailyMetrics,
  hoursByCategory,
  hoursByTrack,
  getWeekBounds,
  eventsInRange,
  weeklyLearningTrend,
  totalLearningHours,
  learningStreak,
  enrichEventsForAI,
} from "@/lib/progressAnalytics";
import type { ScheduleEvent } from "@/types";

function ev(partial: Partial<ScheduleEvent> & Pick<ScheduleEvent, "start" | "end">): ScheduleEvent {
  return {
    id: "e1",
    title: "Study",
    category: "learning",
    status: "done",
    priority: 2,
    ...partial,
  };
}

describe("progressAnalytics", () => {
  it("aggregates daily learning hours", () => {
    const events = [
      ev({ start: "2026-07-07T09:00:00", end: "2026-07-07T10:30:00", category: "learning" }),
      ev({ start: "2026-07-07T14:00:00", end: "2026-07-07T15:00:00", category: "work" }),
    ];
    const days = dailyMetrics(events, 1, new Date(2026, 6, 7));
    expect(days).toHaveLength(1);
    expect(days[0].learningHours).toBe(1.5);
    expect(days[0].allDoneHours).toBe(2.5);
  });

  it("groups by category and track", () => {
    const events = [
      ev({
        start: "2026-07-01T09:00:00",
        end: "2026-07-01T10:00:00",
        meta: { track: "Python" },
      }),
      ev({
        start: "2026-07-02T09:00:00",
        end: "2026-07-02T10:00:00",
        title: "English vocab",
        meta: {},
      }),
      ev({
        start: "2026-07-03T09:00:00",
        end: "2026-07-03T10:30:00",
        title: "Занятие с папой",
        meta: {},
      }),
      ev({
        start: "2026-07-04T09:00:00",
        end: "2026-07-04T10:00:00",
        title: "Stepik Python",
        meta: {},
      }),
    ];
    expect(hoursByCategory(events)[0].hours).toBe(4.5);
    expect(hoursByTrack(events).map((t) => t.name)).toContain("Python");
    expect(hoursByTrack(events).map((t) => t.name)).toContain("English");
    expect(hoursByTrack(events).map((t) => t.name)).toContain("With dad");
    const python = hoursByTrack(events).find((t) => t.name === "Python");
    expect(python?.hours).toBe(2);
  });

  it("computes week bounds Mon–Sun", () => {
    const { startKey, endKey } = getWeekBounds(new Date(2026, 6, 9)); // Thu Jul 9
    expect(startKey).toBe("2026-07-06");
    expect(endKey).toBe("2026-07-12");
  });

  it("filters events in range", () => {
    const events = [
      ev({ start: "2026-07-06T09:00:00", end: "2026-07-06T10:00:00" }),
      ev({ start: "2026-07-13T09:00:00", end: "2026-07-13T10:00:00" }),
    ];
    expect(eventsInRange(events, "2026-07-06", "2026-07-12")).toHaveLength(1);
  });

  it("enriches events for AI with notes", () => {
    const events = [
      ev({
        start: "2026-07-07T09:00:00",
        end: "2026-07-07T10:00:00",
        notes: "Finished chapter 3",
        meta: { track: "ML" },
      }),
    ];
    const out = enrichEventsForAI(events);
    expect(out[0].notes).toBe("Finished chapter 3");
    expect(out[0].durationHours).toBe(1);
  });

  it("computes streak and weekly trend", () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const k = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const events = [
      ev({ start: `${k(0)}T09:00:00`, end: `${k(0)}T10:00:00` }),
      ev({ start: `${k(1)}T09:00:00`, end: `${k(1)}T10:00:00` }),
    ];
    expect(learningStreak(events)).toBeGreaterThanOrEqual(2);
    expect(totalLearningHours(events)).toBe(2);
    expect(weeklyLearningTrend(events, 2).length).toBeGreaterThan(0);
  });
});
