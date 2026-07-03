import type { ScheduleEvent, LearningTrack } from "@/types";

export interface TrackStats {
  loggedHours: number;
  streak: number;
  lastActive?: string;
  sessions: number;
}

function hours(ev: ScheduleEvent): number {
  const ms = new Date(ev.end).getTime() - new Date(ev.start).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

function matchesTrack(ev: ScheduleEvent, track: LearningTrack): boolean {
  if (ev.category !== "learning") return false;
  const t = track.name.toLowerCase();
  if (ev.meta?.track && ev.meta.track.toLowerCase() === t) return true;
  return ev.title.toLowerCase().includes(t);
}

/** Derive logged hours + day streak for a track from completed schedule events. */
export function computeTrackStats(
  events: ScheduleEvent[],
  track: LearningTrack
): TrackStats {
  const done = events.filter((e) => e.status === "done" && matchesTrack(e, track));
  const loggedHours = done.reduce((a, e) => a + hours(e), 0);

  const days = new Set(done.map((e) => e.start.slice(0, 10)));
  let streak = 0;
  const cur = new Date();
  // Allow the streak to start today or yesterday.
  const key = (d: Date) => d.toISOString().slice(0, 10);
  if (!days.has(key(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(key(cur))) {
    streak += 1;
    cur.setDate(cur.getDate() - 1);
  }

  const lastActive = done
    .map((e) => e.start)
    .sort()
    .at(-1);

  return { loggedHours, streak, lastActive, sessions: done.length };
}

export function totalLearningHours(
  events: ScheduleEvent[],
  tracks: LearningTrack[]
): number {
  return tracks.reduce((a, t) => a + computeTrackStats(events, t).loggedHours, 0);
}
