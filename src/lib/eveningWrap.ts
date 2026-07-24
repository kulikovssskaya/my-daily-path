import type { DailyLog, LinkedInPostIdea, ScheduleEvent } from "@/types";
import {
  dateKey,
  eventDurationHours,
  inferTrackFromTitle,
} from "@/lib/progressAnalytics";

export interface TodayProgressSnapshot {
  date: string;
  learningHours: number;
  sessions: { title: string; hours: number; track: string; timeRange: string }[];
  byTrack: { name: string; hours: number }[];
  notes: string[];
}

function formatHm(iso: string): string {
  const t = iso.includes("T") ? iso.split("T")[1] : iso;
  return t.slice(0, 5);
}

/** Build a structured view of today's done Learning sessions + notes. */
export function todayProgressSnapshot(
  events: ScheduleEvent[],
  logs: DailyLog[],
  day = new Date()
): TodayProgressSnapshot {
  const date = dateKey(day);
  const dayEvents = events.filter(
    (e) =>
      e.status === "done" &&
      e.category === "learning" &&
      e.start.slice(0, 10) === date &&
      !/evening (linkedin )?summary/i.test(e.title)
  );

  const sessions = dayEvents.map((e) => {
    const hours = Math.round(eventDurationHours(e) * 10) / 10;
    const track = e.meta?.track?.trim() || inferTrackFromTitle(e.title);
    return {
      title: e.title,
      hours,
      track,
      timeRange: `${formatHm(e.start)}–${formatHm(e.end)}`,
    };
  });

  const trackMap = new Map<string, number>();
  for (const s of sessions) {
    trackMap.set(s.track, (trackMap.get(s.track) ?? 0) + s.hours);
  }

  const notes = logs
    .filter((l) => l.date === date && l.kind !== "evening-summary")
    .map((l) => l.text.trim())
    .filter(Boolean);

  return {
    date,
    learningHours: Math.round(
      sessions.reduce((a, s) => a + s.hours, 0) * 10
    ) / 10,
    sessions,
    byTrack: [...trackMap.entries()]
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours),
    notes,
  };
}

/** Text blob for the LinkedIn evening AI prompt. */
export function formatTodayContext(
  snap: TodayProgressSnapshot,
  extraNote?: string
): string {
  const lines: string[] = [`Date: ${snap.date}`, `Learning hours today: ${snap.learningHours}h`];

  if (snap.byTrack.length) {
    lines.push(
      "By activity: " + snap.byTrack.map((t) => `${t.name} ${t.hours}h`).join(", ")
    );
  }

  if (snap.sessions.length) {
    lines.push("Sessions:");
    for (const s of snap.sessions) {
      lines.push(`- ${s.timeRange} · ${s.title} (${s.hours}h, ${s.track})`);
    }
  } else {
    lines.push("Sessions: none marked done yet on Calendar.");
  }

  if (snap.notes.length) {
    lines.push("User notes:");
    for (const n of snap.notes) lines.push(`- ${n}`);
  }

  if (extraNote?.trim()) {
    lines.push(`Extra reflection: ${extraNote.trim()}`);
  }

  return lines.join("\n");
}

/** Consecutive days (ending today or yesterday) with an evening summary saved. */
export function eveningWrapStreak(
  logs: DailyLog[],
  posts: LinkedInPostIdea[],
  today = new Date()
): number {
  const days = new Set<string>();
  for (const l of logs) {
    if (l.kind === "evening-summary") days.add(l.date);
  }
  for (const p of posts) {
    if (p.eveningWrap && p.sourceDate) days.add(p.sourceDate);
  }

  let streak = 0;
  const cur = new Date(today);
  const key = (d: Date) => dateKey(d);
  if (!days.has(key(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(key(cur))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export function hasEveningWrapToday(
  logs: DailyLog[],
  posts: LinkedInPostIdea[],
  today = new Date()
): boolean {
  const date = dateKey(today);
  return (
    logs.some((l) => l.date === date && l.kind === "evening-summary") ||
    posts.some((p) => p.eveningWrap && p.sourceDate === date)
  );
}
