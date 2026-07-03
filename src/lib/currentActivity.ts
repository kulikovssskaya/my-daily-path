import type { ScheduleEvent, Habit, EventCategory } from "@/types";
import { habitOccurrencesForDate } from "@/lib/habits";

export interface CurrentActivity {
  title: string;
  category: EventCategory;
  track?: string;
  source: "event" | "habit";
  endsAt: string;
}

function parseLocal(iso: string): Date {
  const [date, time] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function isNowBetween(now: Date, startIso: string, endIso: string): boolean {
  const start = parseLocal(startIso);
  const end = parseLocal(endIso);
  return now >= start && now < end;
}

/** Guess what the user is doing right now from schedule events + habits. */
export function detectCurrentActivity(
  now: Date,
  events: ScheduleEvent[],
  habits: Habit[]
): CurrentActivity | null {
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const activeEvents = events
    .filter((e) => e.start.slice(0, 10) === key && isNowBetween(now, e.start, e.end))
    .sort((a, b) => a.start.localeCompare(b.start));

  if (activeEvents.length > 0) {
    const e = activeEvents[0];
    return {
      title: e.title,
      category: e.category,
      track: e.meta?.track,
      source: "event",
      endsAt: e.end,
    };
  }

  const occs = habitOccurrencesForDate(habits, now).filter((o) =>
    isNowBetween(now, o.start, o.end)
  );
  if (occs.length > 0) {
    const o = occs[0];
    return {
      title: o.title,
      category: o.category,
      source: "habit",
      endsAt: o.end,
    };
  }

  return null;
}
