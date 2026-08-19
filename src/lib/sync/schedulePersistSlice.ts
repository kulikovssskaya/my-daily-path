import type { Habit, ScheduleEvent } from "@/types";
import { normalizeHabitTime } from "@/lib/habits";

import { touchTimestamp } from "@/lib/dataProtection";

export interface SchedulePersistSlice {
  events: ScheduleEvent[];
  habits: Habit[];
  deletedHabitIds?: Record<string, string>;
}

/** Normalize persisted JSON (wrapper or flat) into schedule slice fields. */
export function parseSchedulePersistSlice(persisted: unknown): SchedulePersistSlice {
  const wrapper = (persisted ?? {}) as {
    state?: Partial<SchedulePersistSlice>;
    events?: ScheduleEvent[];
    habits?: Habit[];
    deletedHabitIds?: Record<string, string>;
  };
  const state = wrapper.state ?? wrapper;
  return {
    events: Array.isArray(state.events) ? state.events : [],
    habits: Array.isArray(state.habits) ? state.habits : [],
    deletedHabitIds:
      state.deletedHabitIds && typeof state.deletedHabitIds === "object"
        ? state.deletedHabitIds
        : {},
  };
}

export function migrateSchedulePersistSlice(persisted: unknown): SchedulePersistSlice {
  const slice = parseSchedulePersistSlice(persisted);
  return {
    events: slice.events,
    habits: slice.habits.map((h) => ({
      ...h,
      weekdays: Array.isArray(h.weekdays) ? h.weekdays : [],
      time: typeof h.time === "string" ? normalizeHabitTime(h.time) : "18:00",
      locked: false,
      lockedAt: undefined,
    })),
    deletedHabitIds: slice.deletedHabitIds ?? {},
  };
}

/** v5: remove health/work/etc. recurring habits — keep learning only. */
export function dropNonLearningHabits(slice: SchedulePersistSlice): SchedulePersistSlice {
  const deletedHabitIds = { ...(slice.deletedHabitIds ?? {}) };
  for (const h of slice.habits) {
    if (h.category !== "learning") {
      deletedHabitIds[h.id] = touchTimestamp();
    }
  }
  return {
    ...slice,
    habits: slice.habits.filter((h) => h.category === "learning"),
    deletedHabitIds,
  };
}
