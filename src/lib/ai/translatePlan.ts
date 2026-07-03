import "server-only";
import { z } from "zod";
import { chatComplete, AIConfigError, getProviderInfo } from "./provider";
import { extractJson, stripNulls, type AIEvent } from "./schemas";

const CYRILLIC = /[\u0400-\u04FF]/;

export function textNeedsEnglish(s: string | undefined): boolean {
  return Boolean(s && CYRILLIC.test(s));
}

export function planNeedsEnglish(plan: {
  summary?: string;
  reasoning?: string;
  events: AIEvent[];
}): boolean {
  if (textNeedsEnglish(plan.summary) || textNeedsEnglish(plan.reasoning)) return true;
  return plan.events.some(
    (e) => textNeedsEnglish(e.title) || textNeedsEnglish(e.notes)
  );
}

const translatePlanSchema = z.object({
  events: z
    .array(
      z.object({
        index: z.number().int(),
        title: z.string().min(1),
        notes: z.string().optional(),
      })
    )
    .default([]),
  summary: z.string().optional(),
  reasoning: z.string().optional(),
});

const TRANSLATE_SYSTEM = `You translate schedule planner output into natural English.
Rules:
- Translate EVERY title, note, summary and reasoning field. Output must contain NO Cyrillic or other non-English text.
- Keep technical terms as standard English (Pandas, matplotlib, seaborn, EDA, ML).
- Keep times, numbers and durations unchanged in meaning.
- Do NOT change event order. Use the same "index" for each event.
- Be concise. Titles should fit a calendar row (~80 chars max).
Return STRICT JSON only:
{ "events": [{ "index": 0, "title": "...", "notes": "..."? }], "summary": "...", "reasoning": "..." }`;

/**
 * Translate plan text fields to English via AI. Times/categories are untouched.
 * Returns original plan when no Cyrillic or no API key.
 */
export async function translatePlanToEnglish(plan: {
  events: AIEvent[];
  summary: string;
  reasoning: string;
}): Promise<{ events: AIEvent[]; summary: string; reasoning: string; translated: boolean }> {
  if (!planNeedsEnglish(plan)) {
    return { ...plan, translated: false };
  }

  const payload = {
    events: plan.events.map((e, index) => ({
      index,
      title: e.title,
      notes: e.notes,
    })),
    summary: plan.summary,
    reasoning: plan.reasoning,
  };

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: TRANSLATE_SYSTEM },
        { role: "user", content: JSON.stringify(payload) },
      ],
      { json: true, temperature: 0.2, maxTokens: 2500 }
    );

    const parsed = translatePlanSchema.parse(stripNulls(extractJson(raw)));
    const byIndex = new Map(parsed.events.map((e) => [e.index, e]));

    const events = plan.events.map((ev, i) => {
      const t = byIndex.get(i);
      if (!t) return ev;
      return {
        ...ev,
        title: t.title.trim() || ev.title,
        notes: t.notes?.trim() ? t.notes.trim() : ev.notes,
      };
    });

    return {
      events,
      summary: parsed.summary?.trim() || plan.summary,
      reasoning: parsed.reasoning?.trim() || plan.reasoning,
      translated: true,
    };
  } catch (err) {
    if (err instanceof AIConfigError) {
      return { ...plan, translated: false };
    }
    throw err;
  }
}

export function planProviderLabel(base: string, translated: boolean): string {
  if (!translated) return base;
  const ai = getProviderInfo().provider;
  return base === "local" || base === "fallback" ? `${base}+${ai}` : ai;
}
