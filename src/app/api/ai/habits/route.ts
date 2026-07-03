import { NextResponse } from "next/server";
import { runStructured } from "@/lib/ai/run";
import { HABITS_SYSTEM, buildHabitsUserMessage } from "@/lib/ai/prompts";
import { habitsResponseSchema, type HabitsResponse } from "@/lib/ai/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const instruction: string = typeof body?.instruction === "string" ? body.instruction : "";
  const existingHabits = Array.isArray(body?.existingHabits) ? body.existingHabits : [];
  if (!instruction.trim()) {
    return NextResponse.json({ error: "Empty text." }, { status: 400 });
  }

  const fallback = (): HabitsResponse => ({
    reasoning:
      "Building habits from free text needs an AI key. Add a provider key in .env.local, then try again.",
    mode: "merge",
    habits: [],
  });

  try {
    const result = await runStructured({
      system: HABITS_SYSTEM,
      user: buildHabitsUserMessage({ instruction, existingHabits }),
      schema: habitsResponseSchema,
      fallback,
      temperature: 0.3,
      maxTokens: 3000,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
