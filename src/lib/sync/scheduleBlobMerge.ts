import { looksLikeOrphanRizeCalendarEvent } from "@/lib/integrations/rize";
import type { Habit, ScheduleEvent } from "@/types";

export interface SchedulePersistState {
  events: ScheduleEvent[];
  habits: Habit[];
}

function parseSchedulePersistBlob(raw: string): {
  wrapper: Record<string, unknown>;
  state: SchedulePersistState;
} | null {
  try {
    const parsed = JSON.parse(raw) as {
      state?: Partial<SchedulePersistState>;
      version?: number;
    };
    const state = parsed.state ?? (parsed as Partial<SchedulePersistState>);
    if (!state || typeof state !== "object") return null;
    return {
      wrapper: parsed as Record<string, unknown>,
      state: {
        events: Array.isArray(state.events) ? state.events : [],
        habits: Array.isArray(state.habits) ? state.habits : [],
      },
    };
  } catch {
    return null;
  }
}

function serializeSchedulePersistBlob(
  wrapper: Record<string, unknown>,
  state: SchedulePersistState
): string {
  return JSON.stringify({ ...wrapper, state });
}

function eventTimestamp(ev: ScheduleEvent): number {
  return ev.lastModifiedAt ? new Date(ev.lastModifiedAt).getTime() : 0;
}

function habitTimestamp(h: Habit): number {
  return h.lastModifiedAt ? new Date(h.lastModifiedAt).getTime() : 0;
}

function eventCanonicalKey(ev: ScheduleEvent): string {
  const rizeId = ev.meta?.rizeEntryId;
  if (rizeId) return `rize:${rizeId}`;
  if (looksLikeOrphanRizeCalendarEvent(ev)) {
    return `orphan:${ev.start.slice(0, 16)}:${ev.title.trim().toLowerCase()}`;
  }
  return `id:${ev.id}`;
}

function habitCanonicalKey(h: Habit): string {
  const weekdays = [...h.weekdays].sort((a, b) => a - b).join(",");
  return `${h.title.trim().toLowerCase()}|${h.time}|${weekdays}`;
}

function pickBetterEvent(a: ScheduleEvent, b: ScheduleEvent): ScheduleEvent {
  if (a.locked && !b.locked) return a;
  if (b.locked && !a.locked) return b;

  if (a.meta?.rizeTouched && !b.meta?.rizeTouched) return a;
  if (b.meta?.rizeTouched && !a.meta?.rizeTouched) return b;

  const ta = eventTimestamp(a);
  const tb = eventTimestamp(b);
  if (ta !== tb) return ta > tb ? a : b;

  const aRize = Boolean(a.meta?.rizeEntryId);
  const bRize = Boolean(b.meta?.rizeEntryId);
  if (aRize !== bRize) return aRize ? a : b;

  return a;
}

function pickBetterHabit(a: Habit, b: Habit): Habit {
  if (a.locked && !b.locked) return a;
  if (b.locked && !a.locked) return b;

  const ta = habitTimestamp(a);
  const tb = habitTimestamp(b);
  if (ta !== tb) return ta > tb ? a : b;

  return a;
}

export function mergeScheduleEvents(
  a: ScheduleEvent[],
  b: ScheduleEvent[]
): ScheduleEvent[] {
  const byKey = new Map<string, ScheduleEvent>();

  for (const ev of [...a, ...b]) {
    const key = eventCanonicalKey(ev);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickBetterEvent(existing, ev) : ev);
  }

  return [...byKey.values()].sort((x, y) => x.start.localeCompare(y.start));
}

export function mergeScheduleHabits(a: Habit[], b: Habit[]): Habit[] {
  const byKey = new Map<string, Habit>();

  for (const habit of [...a, ...b]) {
    const key = habitCanonicalKey(habit);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickBetterHabit(existing, habit) : habit);
  }

  return [...byKey.values()];
}

export function mergeSchedulePersistStates(
  a: SchedulePersistState,
  b: SchedulePersistState
): SchedulePersistState {
  return {
    events: mergeScheduleEvents(a.events, b.events),
    habits: mergeScheduleHabits(a.habits, b.habits),
  };
}

export function reconcileSchedulePersistBlob(raw: string): string {
  const parsed = parseSchedulePersistBlob(raw);
  if (!parsed) return raw;

  const state = mergeSchedulePersistStates(parsed.state, {
    events: [],
    habits: [],
  });

  return serializeSchedulePersistBlob(parsed.wrapper, state);
}

export function mergeSchedulePersistBlobs(a: string, b: string): string {
  const parsedA = parseSchedulePersistBlob(a);
  const parsedB = parseSchedulePersistBlob(b);
  if (!parsedA) return reconcileSchedulePersistBlob(b);
  if (!parsedB) return reconcileSchedulePersistBlob(a);

  const merged = mergeSchedulePersistStates(parsedA.state, parsedB.state);
  const wrapper = { ...parsedA.wrapper, ...parsedB.wrapper };
  return serializeSchedulePersistBlob(wrapper, merged);
}
