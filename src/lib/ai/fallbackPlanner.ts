import type { PlanResponse } from "./schemas";
import type { PlannerContext } from "./prompts";
import { tryParseTimedPlan, isoAt } from "@/lib/parseTimedPlan";
import type { EventCategory } from "@/types";
import type { AIEvent } from "./schemas";

// ============================================================
// Offline heuristic planner. Used when no AI API key is set.
// ============================================================

function at(date: Date, h: number, m = 0): string {
  return isoAt(date, h * 60 + m);
}

const KEYWORDS: { re: RegExp; category: EventCategory; track?: string }[] = [
  { re: /engl|англ|python|pandas|ml|machine|work|yoga|read/i, category: "learning", track: "ML" },
];

function guessCategory(text: string): { category: EventCategory; track?: string } {
  for (const k of KEYWORDS) if (k.re.test(text)) return { category: k.category, track: k.track };
  return { category: "other" };
}

function durationFromText(text: string): number {
  const h = text.match(/(\d+)\s*(hour|hr|h|час)/i);
  if (h) return parseInt(h[1], 10) * 60;
  const m = text.match(/(\d+)\s*(min|мин)/i);
  if (m) return parseInt(m[1], 10);
  return 60;
}

function buildDefaultDay(date: Date, instruction: string): AIEvent[] {
  const events: AIEvent[] = [];
  events.push({ title: "Breakfast", category: "meal", start: at(date, 8), end: at(date, 8, 30), priority: 2 });
  events.push({ title: "Lunch", category: "meal", start: at(date, 13), end: at(date, 13, 45), priority: 2 });
  events.push({ title: "Dinner", category: "meal", start: at(date, 19), end: at(date, 19, 45), priority: 2 });

  const chunks = instruction
    .split(/[,.;\n]|\band\b|\bи\b/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 2);

  let cursor = 9;
  for (const chunk of chunks) {
    const { category, track } = guessCategory(chunk);
    if (category === "meal" || category === "other") continue;
    const dur = durationFromText(chunk);
    if (cursor === 13) cursor = 14;
    const endH = cursor + Math.max(1, Math.round(dur / 60));
    events.push({
      title: chunk.charAt(0).toUpperCase() + chunk.slice(1),
      category,
      track,
      start: at(date, cursor),
      end: at(date, Math.min(endH, 22)),
      priority: 2,
    });
    cursor = Math.min(endH + 1, 21);
  }

  events.push({ title: "Rest / recharge", category: "rest", start: at(date, 21), end: at(date, 21, 30), priority: 3 });
  return events;
}

export function fallbackPlan(ctx: PlannerContext): PlanResponse {
  const parsed = tryParseTimedPlan(ctx.instruction, ctx.now, ctx.habits);
  if (parsed) {
    return {
      ...parsed,
      reasoning: `${parsed.reasoning} (Offline mode — add an AI key for translation and smarter reordering.)`,
    };
  }

  const now = new Date(ctx.now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const events = [
    ...buildDefaultDay(now, ctx.instruction),
    ...buildDefaultDay(tomorrow, ctx.instruction),
  ].sort((a, b) => a.start.localeCompare(b.start));

  return {
    events,
    reasoning:
      "No explicit times found, so I spread your items across the day. (Offline mode — add an AI key for smarter planning.)",
    summary:
      "Draft plan built offline (no AI key). Add a provider key in .env.local to enable smart planning.",
    memoryUpdates: [],
  };
}
