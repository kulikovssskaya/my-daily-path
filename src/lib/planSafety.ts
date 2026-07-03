import type { AIEvent } from "@/lib/ai/schemas";

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKeyFromIso(nowIso: string): string {
  // Prefer calendar date from naive local ISO (YYYY-MM-DDTHH:mm:ss).
  if (/^\d{4}-\d{2}-\d{2}/.test(nowIso)) return nowIso.slice(0, 10);
  return formatDayKey(new Date(nowIso));
}

export function eventDayKey(iso: string): string {
  return iso.slice(0, 10);
}

export interface SanitizePlanResult {
  events: AIEvent[];
  /** Events removed because their date is before today. */
  droppedPast: number;
  /** True when every event was dropped — caller must NOT apply. */
  blocked: boolean;
}

/** Drop events on days before today. Never silently rewrite history. */
export function sanitizePlanEvents(events: AIEvent[], nowIso: string): SanitizePlanResult {
  const today = todayKeyFromIso(nowIso);
  const safe = events.filter((e) => eventDayKey(e.start) >= today);
  const droppedPast = events.length - safe.length;
  return {
    events: safe,
    droppedPast,
    blocked: events.length > 0 && safe.length === 0,
  };
}

export interface ApplyPlanPreview {
  targetDays: string[];
  eventCount: number;
  droppedPast: number;
}

export function previewPlanApply(events: AIEvent[], nowIso: string): ApplyPlanPreview {
  const { events: safe, droppedPast } = sanitizePlanEvents(events, nowIso);
  const targetDays = [...new Set(safe.map((e) => eventDayKey(e.start)))].sort();
  return { targetDays, eventCount: safe.length, droppedPast };
}
