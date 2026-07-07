import { beforeEach, describe, expect, it } from "vitest";
import { useScheduleStore } from "@/stores/scheduleStore";
import type { ScheduleEvent } from "@/types";

function sampleEvent(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: "ev_test",
    title: "Python study",
    start: "2026-07-07T10:00:00",
    end: "2026-07-07T11:00:00",
    category: "learning",
    status: "done",
    priority: 3,
    lastModifiedAt: "2026-07-07T09:00:00.000Z",
    notes: "Tag: Training\nTitles:\n• Study — 30 min",
    meta: { rizeEntryId: "time_1" },
    ...overrides,
  };
}

describe("scheduleStore", () => {
  beforeEach(() => {
    useScheduleStore.setState({ events: [], habits: [], past: [] });
  });

  it("does not cycle status on locked events", () => {
    useScheduleStore.setState({
      events: [sampleEvent({ id: "ev1", status: "planned", locked: true })],
      habits: [],
      past: [],
    });
    useScheduleStore.getState().cycleStatus("ev1");
    expect(useScheduleStore.getState().events[0].status).toBe("planned");
  });

  it("replaces Rize blocks and removes orphan AI titles", () => {
    useScheduleStore.setState({
      events: [
        sampleEvent({
          id: "orphan",
          title: "Completed Python Debugging Lessons",
          meta: undefined,
        }),
        sampleEvent({ id: "keep", start: "2026-01-01T10:00:00" }),
      ],
      habits: [],
      past: [],
    });

    const { removed, added } = useScheduleStore.getState().replaceRizeEvents(
      [
        {
          rizeEntryId: "time_new",
          title: "Real Rize block",
          category: "learning",
          start: "2026-07-07T14:00:00",
          end: "2026-07-07T15:00:00",
        },
      ],
      168
    );

    expect(removed).toBeGreaterThanOrEqual(1);
    expect(added).toBe(1);
    const titles = useScheduleStore.getState().events.map((e) => e.title);
    expect(titles).toContain("Real Rize block");
    expect(titles.some((t) => t.includes("Completed Python"))).toBe(false);
  });

  it("keeps user-edited Rize imports during replace", () => {
    useScheduleStore.setState({
      events: [
        sampleEvent({
          id: "edited",
          locked: true,
          meta: { rizeEntryId: "time_1", rizeTouched: true },
        }),
      ],
      habits: [],
      past: [],
    });

    const { skipped, added } = useScheduleStore.getState().replaceRizeEvents(
      [
        {
          rizeEntryId: "time_2",
          title: "New",
          category: "work",
          start: "2026-07-07T16:00:00",
          end: "2026-07-07T17:00:00",
        },
      ],
      168
    );

    expect(skipped).toBe(1);
    expect(added).toBe(1);
    expect(useScheduleStore.getState().events.find((e) => e.id === "edited")).toBeTruthy();
  });
});
