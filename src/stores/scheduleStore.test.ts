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

  it("preserves imported events with rizeEntryId in store", () => {
    useScheduleStore.setState({
      events: [sampleEvent({ id: "imported" })],
      habits: [],
      past: [],
    });
    const ev = useScheduleStore.getState().events[0];
    expect(ev?.meta?.rizeEntryId).toBe("time_1");
    expect(ev?.title).toBe("Python study");
  });

  it("marks user edits on imported events with rizeTouched", () => {
    useScheduleStore.setState({
      events: [sampleEvent({ id: "imported", title: "Original" })],
      habits: [],
      past: [],
    });
    useScheduleStore.getState().updateEvent("imported", { title: "My edit" });
    const ev = useScheduleStore.getState().events.find((e) => e.id === "imported");
    expect(ev?.title).toBe("My edit");
    expect(ev?.meta?.rizeTouched).toBe(true);
  });
});
