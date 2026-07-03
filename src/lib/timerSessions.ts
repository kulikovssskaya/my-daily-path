import type { TimerSession } from "@/types";

export const MIN_TIMER_SESSION_MS = 60_000;

export function sessionDurationMs(session: TimerSession, now = Date.now()): number {
  const end = session.endedAt ?? now;
  return Math.max(0, end - session.startedAt);
}

export function sessionDurationMin(session: TimerSession, now = Date.now()): number {
  return Math.max(1, Math.round(sessionDurationMs(session, now) / 60_000));
}

export function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): number {
  return new Date(value).getTime();
}
