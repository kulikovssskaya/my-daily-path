import { describe, expect, it } from "vitest";
import type { ScheduleEvent } from "@/types";
import {
  mergeScheduleEvents,
  mergeSchedulePersistBlobs,
  mergeSchedulePersistStates,
} from "./scheduleBlobMerge";

function rizeEvent(
  rizeEntryId: string,
  title: string,
  start: string,
  id?: string
): ScheduleEvent {
  return {
    id: id ?? `ev_${rizeEntryId}`,
    title,
    category: "work",
    start,
    end: start.replace(/T\d{2}:/, "T19:"),
    status: "done",
    priority: 3,
    meta: { rizeEntryId },
    lastModifiedAt: `${start.slice(0, 10)}T12:00:00.000Z`,
  };
}

function manualEvent(id: string, title: string, start: string): ScheduleEvent {
  return {
    id,
    title,
    category: "learning",
    start,
    end: start.replace(/T\d{2}:/, "T11:"),
    status: "planned",
    priority: 2,
    lastModifiedAt: `${start.slice(0, 10)}T08:00:00.000Z`,
  };
}

describe("mergeScheduleEvents", () => {
  it("keeps both Rize and manual events from different devices", () => {
    const pc = [
      rizeEvent("rize-1", "Deep work", "2026-07-07T09:00:00"),
      rizeEvent("rize-2", "Meeting", "2026-07-07T14:00:00"),
    ];
    const phone = [
      manualEvent("ev_phone_1", "English", "2026-07-07T10:00:00"),
      manualEvent("ev_phone_2", "Gym", "2026-07-07T18:00:00"),
    ];

    const merged = mergeScheduleEvents(pc, phone);
    expect(merged).toHaveLength(4);
    expect(merged.map((e) => e.title).sort()).toEqual([
      "Deep work",
      "English",
      "Gym",
      "Meeting",
    ]);
  });

  it("dedupes same rizeEntryId with different local ids", () => {
    const a = [rizeEvent("rize-1", "Old title", "2026-07-07T09:00:00", "ev_a")];
    const b = [
      {
        ...rizeEvent("rize-1", "Fresh from Rize", "2026-07-07T09:00:00", "ev_b"),
        lastModifiedAt: "2026-07-07T15:00:00.000Z",
      },
    ];

    const merged = mergeScheduleEvents(a, b);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("Fresh from Rize");
    expect(merged[0]?.id).toBe("ev_b");
  });

  it("preserves user-edited Rize event when rizeTouched is set", () => {
    const phone = [
      {
        ...rizeEvent("rize-1", "My custom title", "2026-07-07T09:00:00", "ev_phone"),
        meta: { rizeEntryId: "rize-1", rizeTouched: true },
        lastModifiedAt: "2026-07-07T08:00:00.000Z",
      },
    ];
    const pc = [
      {
        ...rizeEvent("rize-1", "Rize API title", "2026-07-07T09:00:00", "ev_pc"),
        lastModifiedAt: "2026-07-07T16:00:00.000Z",
      },
    ];

    const merged = mergeScheduleEvents(phone, pc);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("My custom title");
  });
});

describe("mergeSchedulePersistBlobs", () => {
  it("merges even when phone blob is larger than PC blob", () => {
    const pc = JSON.stringify({
      state: {
        events: [
          rizeEvent("rize-1", "Rize block", "2026-07-07T09:00:00"),
        ],
        habits: [],
      },
    });

    const phone = JSON.stringify({
      state: {
        events: Array.from({ length: 40 }, (_, i) =>
          manualEvent(`ev_${i}`, `Task ${i}`, `2026-07-0${(i % 7) + 1}T10:00:00`)
        ),
        habits: [],
      },
    });

    expect(phone.length).toBeGreaterThan(pc.length);

    const mergedRaw = mergeSchedulePersistBlobs(pc, phone);
    const merged = JSON.parse(mergedRaw) as { state: { events: ScheduleEvent[] } };

    expect(merged.state.events.some((e) => e.meta?.rizeEntryId === "rize-1")).toBe(true);
    expect(merged.state.events).toHaveLength(41);
  });
});

describe("mergeSchedulePersistStates", () => {
  it("keeps habits with different ids even if title/time match", () => {
    const merged = mergeSchedulePersistStates(
      {
        events: [],
        habits: [
          {
            id: "habit_a",
            title: "Massage",
            weekdays: [2, 4],
            time: "18:00",
            duration: 60,
            category: "health",
          },
        ],
      },
      {
        events: [],
        habits: [
          {
            id: "habit_b",
            title: "Massage",
            weekdays: [2, 4],
            time: "18:00",
            duration: 60,
            category: "health",
            lastModifiedAt: "2026-07-07T12:00:00.000Z",
          },
        ],
      }
    );

    expect(merged.habits).toHaveLength(2);
  });

  it("picks newer edit when merging the same habit id", () => {
    const merged = mergeSchedulePersistStates(
      {
        events: [],
        habits: [
          {
            id: "habit_a",
            title: "Old title",
            weekdays: [2],
            time: "18:00",
            duration: 60,
            category: "health",
            lastModifiedAt: "2026-07-01T12:00:00.000Z",
          },
        ],
      },
      {
        events: [],
        habits: [
          {
            id: "habit_a",
            title: "Updated title",
            weekdays: [2, 4],
            time: "19:00",
            duration: 45,
            category: "learning",
            lastModifiedAt: "2026-07-07T12:00:00.000Z",
          },
        ],
      }
    );

    expect(merged.habits).toHaveLength(1);
    expect(merged.habits[0]?.title).toBe("Updated title");
    expect(merged.habits[0]?.time).toBe("19:00");
  });
});
