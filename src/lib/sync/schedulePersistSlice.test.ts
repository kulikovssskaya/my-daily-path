import { describe, it, expect } from "vitest";
import {
  migrateSchedulePersistSlice,
  parseSchedulePersistSlice,
  dropNonLearningHabits,
} from "@/lib/sync/schedulePersistSlice";

describe("schedulePersistSlice", () => {
  it("reads habits from wrapped persist shape", () => {
    const slice = parseSchedulePersistSlice({
      state: {
        events: [{ id: "e1" }],
        habits: [{ id: "h1", title: "Yoga", weekdays: [1], time: "09:00", duration: 30, category: "health" }],
      },
      version: 2,
    });
    expect(slice.events).toHaveLength(1);
    expect(slice.habits[0]?.title).toBe("Yoga");
  });

  it("migrate unlocks habits and defaults weekdays", () => {
    const migrated = migrateSchedulePersistSlice({
      state: {
        habits: [{ id: "h1", title: "Massage", locked: true, time: "18:00", duration: 60, category: "health" }],
      },
    });
    expect(migrated.habits[0]?.locked).toBe(false);
    expect(migrated.habits[0]?.weekdays).toEqual([]);
  });

  it("dropNonLearningHabits removes health habits and tombstones them", () => {
    const result = dropNonLearningHabits({
      events: [],
      habits: [
        { id: "h1", title: "Massage", weekdays: [2], time: "18:00", duration: 60, category: "health" },
        { id: "h2", title: "Learning with dad", weekdays: [6], time: "10:00", duration: 90, category: "learning" },
      ],
      deletedHabitIds: {},
    });
    expect(result.habits).toHaveLength(1);
    expect(result.habits[0]?.title).toBe("Learning with dad");
    expect(result.deletedHabitIds?.h1).toBeTruthy();
    expect(result.deletedHabitIds?.h2).toBeUndefined();
  });
});
