import type { ScheduleEvent, DailyLog, EventCategory } from "@/types";

export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function eventDurationHours(ev: ScheduleEvent): number {
  const ms = new Date(ev.end).getTime() - new Date(ev.start).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

function formatHm(iso: string): string {
  const t = iso.includes("T") ? iso.split("T")[1] : iso;
  return t.slice(0, 5);
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatHm(start)}–${formatHm(end)}`;
}

export interface DayMetric {
  key: string;
  label: string;
  learningHours: number;
  allDoneHours: number;
  sessionCount: number;
}

/** Daily buckets for the last N days (inclusive of today). */
export function dailyMetrics(
  events: ScheduleEvent[],
  days: number,
  endDate = new Date()
): DayMetric[] {
  const arr: DayMetric[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    arr.push({
      key,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      learningHours: 0,
      allDoneHours: 0,
      sessionCount: 0,
    });
  }
  const keys = new Set(arr.map((a) => a.key));
  for (const e of events) {
    if (e.status !== "done") continue;
    const day = arr.find((a) => a.key === e.start.slice(0, 10));
    if (!day || !keys.has(e.start.slice(0, 10))) continue;
    const h = eventDurationHours(e);
    day.allDoneHours += h;
    if (e.category === "learning") {
      day.learningHours += h;
      day.sessionCount += 1;
    }
  }
  return arr;
}

export interface CategoryMetric {
  category: EventCategory;
  hours: number;
  count: number;
}

export function hoursByCategory(
  events: ScheduleEvent[],
  sinceKey?: string
): CategoryMetric[] {
  const map = new Map<EventCategory, CategoryMetric>();
  for (const e of events) {
    if (e.status !== "done") continue;
    if (sinceKey && e.start.slice(0, 10) < sinceKey) continue;
    const h = eventDurationHours(e);
    const cur = map.get(e.category) ?? { category: e.category, hours: 0, count: 0 };
    cur.hours += h;
    cur.count += 1;
    map.set(e.category, cur);
  }
  return [...map.values()].sort((a, b) => b.hours - a.hours);
}

export interface TrackMetric {
  name: string;
  hours: number;
  sessions: number;
}

/** Group learning events by meta.track or title keyword heuristics. */
export function hoursByTrack(events: ScheduleEvent[]): TrackMetric[] {
  const map = new Map<string, TrackMetric>();
  for (const e of events) {
    if (e.status !== "done" || e.category !== "learning") continue;
    const name = e.meta?.track?.trim() || inferTrackFromTitle(e.title);
    const cur = map.get(name) ?? { name, hours: 0, sessions: 0 };
    cur.hours += eventDurationHours(e);
    cur.sessions += 1;
    map.set(name, cur);
  }
  return [...map.values()].sort((a, b) => b.hours - a.hours);
}

export function inferTrackFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/папа|с папой|\bdad\b|father/.test(t)) return "With dad";
  if (/подготов/.test(t) && /занят|урок|lesson/.test(t)) return "With dad";
  if (/\benglish\b|англ|vocab|flashcard|слов/.test(t)) return "English";
  if (/stepik|степик|\bpython\b|pandas|numpy|debug|программир/.test(t)) return "Python";
  if (/\bml\b|machine learning|neural|sklearn|model|нейросет/.test(t)) return "ML";
  if (/stat|math|математик|probability/.test(t)) return "Math & Stats";
  return "Other";
}

export interface CalendarSessionForAI {
  date: string;
  title: string;
  category: string;
  timeRange: string;
  durationHours: number;
  track?: string;
  notes?: string;
}

export function enrichEventsForAI(
  events: ScheduleEvent[],
  limit = 80
): CalendarSessionForAI[] {
  return events
    .filter((e) => e.status === "done")
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, limit)
    .map((e) => ({
      date: e.start.slice(0, 10),
      title: e.title,
      category: e.category,
      timeRange: formatTimeRange(e.start, e.end),
      durationHours: Math.round(eventDurationHours(e) * 10) / 10,
      track: e.meta?.track,
      notes: e.notes?.trim() || undefined,
    }));
}

/** Monday–Sunday week containing ref date. */
export function getWeekBounds(ref = new Date()) {
  const d = new Date(ref);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  const weekKey = `${startKey}_${endKey}`;
  return { weekKey, startKey, endKey, start, end };
}

export function inDateRange(key: string, startKey: string, endKey: string): boolean {
  return key >= startKey && key <= endKey;
}

export function eventsInRange(
  events: ScheduleEvent[],
  startKey: string,
  endKey: string
): ScheduleEvent[] {
  return events.filter((e) => inDateRange(e.start.slice(0, 10), startKey, endKey));
}

export function logsInRange(logs: DailyLog[], startKey: string, endKey: string): DailyLog[] {
  return logs.filter((l) => inDateRange(l.date, startKey, endKey));
}

export interface WeekMetric {
  weekKey: string;
  label: string;
  learningHours: number;
}

/** Learning hours per calendar week for the last N weeks. */
export function weeklyLearningTrend(events: ScheduleEvent[], weeks = 4): WeekMetric[] {
  const arr: WeekMetric[] = [];
  const ref = new Date();
  for (let w = weeks - 1; w >= 0; w--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - w * 7);
    const { weekKey, startKey, endKey, start } = getWeekBounds(d);
    if (arr.some((a) => a.weekKey === weekKey)) continue;
    const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    let learningHours = 0;
    for (const e of events) {
      if (e.status !== "done" || e.category !== "learning") continue;
      if (inDateRange(e.start.slice(0, 10), startKey, endKey)) {
        learningHours += eventDurationHours(e);
      }
    }
    arr.push({ weekKey, label, learningHours: Math.round(learningHours * 10) / 10 });
  }
  return arr;
}

export function totalLearningHours(events: ScheduleEvent[], sinceKey?: string): number {
  return events
    .filter(
      (e) =>
        e.status === "done" &&
        e.category === "learning" &&
        (!sinceKey || e.start.slice(0, 10) >= sinceKey)
    )
    .reduce((a, e) => a + eventDurationHours(e), 0);
}

export function learningHoursInRange(
  events: ScheduleEvent[],
  startKey: string,
  endKey: string
): number {
  return eventsInRange(events, startKey, endKey)
    .filter((e) => e.status === "done" && e.category === "learning")
    .reduce((a, e) => a + eventDurationHours(e), 0);
}

export function learningStreak(events: ScheduleEvent[]): number {
  const days = new Set(
    events
      .filter((e) => e.status === "done" && e.category === "learning")
      .map((e) => e.start.slice(0, 10))
  );
  let streak = 0;
  const cur = new Date();
  const key = (d: Date) => dateKey(d);
  if (!days.has(key(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(key(cur))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}
