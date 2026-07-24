import { describe, it, expect } from "vitest";
import {
  todayProgressSnapshot,
  formatTodayContext,
  eveningWrapStreak,
  hasEveningWrapToday,
} from "@/lib/eveningWrap";
import type { DailyLog, LinkedInPostIdea, ScheduleEvent } from "@/types";

function ev(partial: Partial<ScheduleEvent> & Pick<ScheduleEvent, "start" | "end" | "title">): ScheduleEvent {
  return {
    id: "e1",
    category: "learning",
    status: "done",
    priority: 2,
    ...partial,
  };
}

describe("eveningWrap", () => {
  it("snapshots today’s learning sessions", () => {
    const day = new Date(2026, 6, 24);
    const events = [
      ev({
        title: "Stepik Python",
        start: "2026-07-24T10:00:00",
        end: "2026-07-24T11:30:00",
      }),
      ev({
        title: "Занятие с папой",
        start: "2026-07-24T18:00:00",
        end: "2026-07-24T19:00:00",
      }),
      ev({
        title: "Other day",
        start: "2026-07-23T10:00:00",
        end: "2026-07-23T11:00:00",
      }),
    ];
    const snap = todayProgressSnapshot(events, [], day);
    expect(snap.learningHours).toBe(2.5);
    expect(snap.sessions).toHaveLength(2);
    expect(snap.byTrack.map((t) => t.name)).toEqual(
      expect.arrayContaining(["Python", "With dad"])
    );
    const ctx = formatTodayContext(snap, "Felt stuck on loops");
    expect(ctx).toContain("Stepik Python");
    expect(ctx).toContain("Felt stuck on loops");
  });

  it("computes evening wrap streak", () => {
    const logs: DailyLog[] = [
      {
        id: "1",
        date: "2026-07-24",
        text: "wrap",
        createdAt: "",
        kind: "evening-summary",
      },
      {
        id: "2",
        date: "2026-07-23",
        text: "wrap",
        createdAt: "",
        kind: "evening-summary",
      },
    ];
    const posts: LinkedInPostIdea[] = [];
    expect(eveningWrapStreak(logs, posts, new Date(2026, 6, 24))).toBe(2);
    expect(hasEveningWrapToday(logs, posts, new Date(2026, 6, 24))).toBe(true);
    expect(hasEveningWrapToday(logs, posts, new Date(2026, 6, 25))).toBe(false);
  });
});
