import { NextResponse } from "next/server";
import { runStructured } from "@/lib/ai/run";
import { POST_SYSTEM, buildPostUserMessage } from "@/lib/ai/prompts";
import { postIdeasSchema } from "@/lib/ai/schemas";
import { normalizeMemory } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const memory = normalizeMemory(body?.memory);
  const context: string = typeof body?.context === "string" ? body.context : "";

  const fallback = () => ({
    ideas: [
      {
        topic: "My path into Machine Learning",
        draft:
          "Another step toward my goal today — learning ML in 3–4 months. Sharing what I studied and how I'm applying it in practice. #MachineLearning #Learning",
      },
      {
        topic: "Lesson of the week",
        draft:
          "This week I realized something important about learning: consistency beats intensity. What helps you keep the rhythm?",
      },
    ],
  });

  try {
    const result = await runStructured({
      system: POST_SYSTEM,
      user: buildPostUserMessage({ memory, context }),
      schema: postIdeasSchema,
      fallback,
      temperature: 0.9,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
