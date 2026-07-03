import type { Habit, EventCategory } from "@/types";

export interface HabitOccurrence {
  id: string;
  habitId: string;
  title: string;
  category: EventCategory;
  start: string; // naive local ISO
  end: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Concrete habit instances for a given calendar day (for the agenda view). */
export function habitOccurrencesForDate(habits: Habit[], date: Date): HabitOccurrence[] {
  const wd = date.getDay();
  const key = dayKey(date);
  return habits
    .filter((h) => h.weekdays.includes(wd))
    .map((h) => {
      const [hh, mm] = h.time.split(":").map((n) => parseInt(n, 10));
      const startMin = (hh || 0) * 60 + (mm || 0);
      const endMin = startMin + h.duration;
      const eh = Math.min(Math.floor(endMin / 60), 23);
      const em = endMin % 60;
      return {
        id: `habit_${h.id}_${key}`,
        habitId: h.id,
        title: h.title,
        category: h.category,
        start: `${key}T${pad(hh || 0)}:${pad(mm || 0)}:00`,
        end: `${key}T${pad(eh)}:${pad(em)}:00`,
      };
    });
}

/** FullCalendar recurring-event objects so habits appear on every matching day. */
export function habitRecurringEvents(
  habits: Habit[],
  colorOf: (c: EventCategory) => string
) {
  return habits.map((h) => {
    const [hh, mm] = h.time.split(":").map((n) => parseInt(n, 10));
    const startMin = (hh || 0) * 60 + (mm || 0);
    const endMin = startMin + h.duration;
    const eh = Math.min(Math.floor(endMin / 60), 23);
    const em = endMin % 60;
    return {
      id: `habit_${h.id}`,
      title: `${h.title} (habit)`,
      daysOfWeek: h.weekdays,
      startTime: `${pad(hh || 0)}:${pad(mm || 0)}`,
      endTime: `${pad(eh)}:${pad(em)}`,
      backgroundColor: colorOf(h.category),
      borderColor: colorOf(h.category),
      editable: false,
    };
  });
}
