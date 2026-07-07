import { z } from "zod";

// ============================================================
// Zod schemas for structured AI responses.
// Every AI endpoint returns JSON validated against these,
// so the "live prompt" stays predictable across the app.
// ============================================================

export const eventCategorySchema = z.enum([
  "learning",
  "work",
  "health",
  "meal",
  "rest",
  "commute",
  "habit",
  "other",
]);

export const energySchema = z.enum(["low", "mid", "high"]);

/** A single event as produced by the planner (no id/status yet). */
export const aiEventSchema = z.object({
  title: z.string().min(1),
  category: eventCategorySchema.default("other"),
  start: z.string().describe("ISO 8601 local datetime, e.g. 2026-07-01T09:00:00"),
  end: z.string().describe("ISO 8601 local datetime"),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  energy: energySchema.optional(),
  track: z.string().optional().describe("learning track name if category=learning"),
  notes: z.string().optional(),
});

export type AIEvent = z.infer<typeof aiEventSchema>;

/** Full planner response: rebuilt schedule + a short coach note. */
export const planResponseSchema = z.object({
  events: z.array(aiEventSchema).default([]),
  reasoning: z
    .string()
    .default("")
    .describe("Short step-by-step thinking about how the plan was built"),
  summary: z.string().default(""),
  memoryUpdates: z
    .array(z.string())
    .default([])
    .describe("New long-term memory facts inferred from the user's message"),
});

export type PlanResponse = z.infer<typeof planResponseSchema>;

// ---------- Progress report ----------
export const progressReportSchema = z.object({
  summary: z.string().default(""),
  recommendations: z.array(z.string()).default([]),
  focusMore: z.array(z.string()).default([]),
  focusLess: z.array(z.string()).default([]),
});
export type ProgressReport = z.infer<typeof progressReportSchema>;

export const weeklyProgressReportSchema = z.object({
  summary: z.string().default(""),
  totalLearningHours: z.number().optional(),
  highlights: z.array(z.string()).default([]),
  topicsStudied: z.array(z.string()).default([]),
  dynamics: z.string().default(""),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  nextWeekFocus: z.array(z.string()).default([]),
});
export type WeeklyProgressReport = z.infer<typeof weeklyProgressReportSchema>;

// ---------- Cooking: natural-language fridge command (add + remove) ----------
export const fridgeCommandSchema = z.object({
  reasoning: z.string().default(""),
  add: z
    .array(z.object({ name: z.string().min(1), qty: z.string().optional() }))
    .default([]),
  remove: z.array(z.string()).default([]),
});
export type FridgeCommand = z.infer<typeof fridgeCommandSchema>;

// ---------- Schedule: recurring habits parsed from text ----------
export const aiHabitSchema = z.object({
  title: z.string().min(1),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).default([]),
  time: z.string().default("09:00"),
  duration: z.coerce.number().int().min(1).max(600).default(30),
  category: eventCategorySchema.default("other"),
});
export const habitsResponseSchema = z.object({
  reasoning: z.string().default(""),
  mode: z.enum(["merge", "replace"]).default("merge"),
  habits: z.array(aiHabitSchema).default([]),
});
export type AIHabit = z.infer<typeof aiHabitSchema>;
export type HabitsResponse = z.infer<typeof habitsResponseSchema>;

// ---------- Cooking: recipe suggestions ----------
export const recipeSchema = z.object({
  title: z.string().min(1),
  ingredients: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  timeMinutes: z.coerce.number().int().default(30),
  calories: z.coerce.number().int().optional(),
  usesItems: z.array(z.string()).default([]),
});
export const recipesResponseSchema = z.object({
  recipes: z.array(recipeSchema).default([]),
});
export type AIRecipe = z.infer<typeof recipeSchema>;

// ---------- Career: job postings ----------
export const jobPostingSchema = z.object({
  title: z.string().min(1),
  company: z.string().default(""),
  location: z.string().default("Remote"),
  description: z.string().default(""),
  matchScore: z.coerce.number().int().min(0).max(100).default(50),
  source: z.string().default("AI"),
  url: z.string().optional(),
});
export const jobsResponseSchema = z.object({
  jobs: z.array(jobPostingSchema).default([]),
});
export type AIJobPosting = z.infer<typeof jobPostingSchema>;

// ---------- Career: application (adapted CV + cover letter) ----------
export const applicationResponseSchema = z.object({
  adaptedCV: z.string().default(""),
  coverLetter: z.string().default(""),
  tips: z.array(z.string()).default([]),
});
export type ApplicationResponse = z.infer<typeof applicationResponseSchema>;

// ---------- Career: LinkedIn post ideas ----------
export const postIdeasSchema = z.object({
  ideas: z
    .array(
      z.object({
        topic: z.string().min(1),
        draft: z.string().default(""),
      })
    )
    .default([]),
});

// ---------- Daily English: vocabulary drop ----------
export const englishCategorySchema = z.enum([
  "everyday",
  "it",
  "ml",
  "analytics",
  "phrasal",
  "idiom",
]);
export const englishDifficultySchema = z.enum(["B1", "B1+", "B2"]);

export const englishVocabItemSchema = z.object({
  term: z.string().min(1),
  translationRu: z.string().min(1),
  definition: z.string().min(1),
  example: z.string().min(1),
  category: englishCategorySchema,
  difficulty: englishDifficultySchema,
});

export const englishVocabDropSchema = z.object({
  reasoning: z.string().default(""),
  words: z.array(englishVocabItemSchema).min(10).max(30),
});
export type EnglishVocabDrop = z.infer<typeof englishVocabDropSchema>;

/**
 * Recursively drop `null` values so optional fields validate correctly.
 * Some models (e.g. Llama on Groq) emit `"track": null` instead of omitting it,
 * which would otherwise fail `z.string().optional()`.
 */
export function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripNulls(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null) continue;
      out[k] = stripNulls(v);
    }
    return out as T;
  }
  return value;
}

/** Loose parse helper: tolerate models that wrap JSON in prose/markdown. */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip ```json ... ``` fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in model response.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
