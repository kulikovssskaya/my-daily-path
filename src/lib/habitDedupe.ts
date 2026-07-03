import type { ScheduleEvent, Habit } from "@/types";
import type { HabitOccurrence } from "@/lib/habits";
import { habitOccurrencesForDate } from "@/lib/habits";

export function normalizeHabitTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\(habit\)\s*/gi, "")
    .trim();
}

export function titlesMatch(a: string, b: string): boolean {
  const na = normalizeHabitTitle(a);
  const nb = normalizeHabitTitle(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function timeOf(iso: string): string {
  return iso.slice(11, 16);
}

function weekdayFromIso(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** True when a schedule event duplicates a recurring habit on that day/time. */
export function eventDuplicatesHabit(ev: ScheduleEvent, habits: Habit[]): boolean {
  const wd = weekdayFromIso(ev.start);
  const startTime = timeOf(ev.start);
  return habits.some(
    (h) =>
      h.weekdays.includes(wd) &&
      h.time.slice(0, 5) === startTime &&
      titlesMatch(ev.title, h.title)
  );
}

/** Hide planner echoes of habits (same title on the same day, even at a different time). */
export function eventEchoesHabitOnDay(ev: ScheduleEvent, habits: Habit[]): boolean {
  if (eventDuplicatesHabit(ev, habits)) return true;
  const [y, m, d] = ev.start.slice(0, 10).split("-").map(Number);
  const occs = habitOccurrencesForDate(habits, new Date(y, m - 1, d));
  return occs.some((occ) => titlesMatch(ev.title, occ.title));
}

/** True when a schedule event duplicates a habit occurrence in the agenda. */
export function eventOverlapsOccurrence(ev: ScheduleEvent, occ: HabitOccurrence): boolean {
  if (!titlesMatch(ev.title, occ.title)) return false;
  return timeOf(ev.start) === timeOf(occ.start);
}
