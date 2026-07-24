import { NextResponse } from "next/server";
import { z } from "zod";
import { guardAiRequest } from "@/lib/ai/aiAuthServer";
import {
  chatComplete,
  AIConfigError,
  getProviderInfo,
} from "@/lib/ai/provider";
import {
  PLANNER_SYSTEM,
  buildPlannerUserMessage,
  type PlannerContext,
} from "@/lib/ai/prompts";
import { planResponseSchema, extractJson, stripNulls } from "@/lib/ai/schemas";
import { fallbackPlan } from "@/lib/ai/fallbackPlanner";
import { translatePlanToEnglish, planProviderLabel } from "@/lib/ai/translatePlan";
import type { Pace } from "@/types";
import { tryParseTimedPlan } from "@/lib/parseTimedPlan";
import { sanitizePlanEvents } from "@/lib/planSafety";
import type { PlanResponse } from "@/lib/ai/schemas";

export const runtime = "nodejs";

const requestSchema = z.object({
  instruction: z.string().min(1, "Describe what you'd like to plan."),
  now: z.string().optional(),
  timezone: z.string().optional(),
  memory: z
    .object({
      goals: z.array(z.string()).default([]),
      values: z.array(z.string()).default([]),
      constraints: z.array(z.string()).default([]),
      learningPace: z.record(z.string(), z.string()).default({}),
      preferences: z.array(z.string()).default([]),
      notes: z
        .array(z.object({ id: z.string(), text: z.string(), createdAt: z.string() }))
        .default([]),
    })
    .partial()
    .optional(),
  events: z.array(z.any()).default([]),
  habits: z.array(z.any()).default([]),
});

async function finalizePlan(
  plan: PlanResponse,
  now: string,
  provider: string,
  usedFallback: boolean
) {
  const { events: safeEvents } = sanitizePlanEvents(plan.events, now);
  const base = { ...plan, events: safeEvents };

  const en = await translatePlanToEnglish({
    events: base.events,
    summary: base.summary,
    reasoning: base.reasoning ?? "",
  });

  return {
    ...base,
    events: en.events,
    summary: en.summary,
    reasoning: en.reasoning,
    provider: planProviderLabel(provider, en.translated),
    usedFallback,
  };
}

export async function POST(req: Request) {
  const denied = guardAiRequest(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Bad request." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const ctx: PlannerContext = {
    instruction: data.instruction,
    now: data.now ?? new Date().toISOString(),
    timezone: data.timezone ?? "UTC",
    memory: {
      goals: data.memory?.goals ?? [],
      values: data.memory?.values ?? [],
      constraints: data.memory?.constraints ?? [],
      learningPace: (data.memory?.learningPace ?? {}) as Record<string, Pace>,
      preferences: data.memory?.preferences ?? [],
      notes: data.memory?.notes ?? [],
    },
    events: data.events as PlannerContext["events"],
    habits: data.habits as PlannerContext["habits"],
  };

  const local = tryParseTimedPlan(ctx.instruction, ctx.now, ctx.habits);
  if (local) {
    return NextResponse.json(await finalizePlan(local, ctx.now, "local", false));
  }

  try {
    const raw = await chatComplete(
      [
        { role: "system", content: PLANNER_SYSTEM },
        { role: "user", content: buildPlannerUserMessage(ctx) },
      ],
      { json: true, temperature: 0.6, maxTokens: 3000 }
    );

    const json = stripNulls(extractJson(raw));
    const plan = planResponseSchema.parse(json);
    const info = getProviderInfo();
    return NextResponse.json(
      await finalizePlan(plan, ctx.now, info.provider, false)
    );
  } catch (err) {
    if (err instanceof AIConfigError) {
      const plan = fallbackPlan(ctx);
      return NextResponse.json(
        await finalizePlan(plan, ctx.now, "fallback", true)
      );
    }
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
