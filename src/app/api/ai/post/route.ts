import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/ai/aiAuthServer";
import { runStructured } from "@/lib/ai/run";
import {
  POST_SYSTEM,
  EVENING_POST_SYSTEM,
  buildPostUserMessage,
  buildEveningPostUserMessage,
} from "@/lib/ai/prompts";
import { postIdeasSchema } from "@/lib/ai/schemas";
import { normalizeMemory } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = guardAiRequest(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const memory = normalizeMemory(body?.memory);
  const context: string = typeof body?.context === "string" ? body.context : "";
  const mode = body?.mode === "evening" ? "evening" : "ideas";

  const fallback = () => ({
    ideas: [
      {
        topic: "A concrete step today",
        draft:
          mode === "evening"
            ? "Wrapped up another study day. Not perfect — but I showed up, logged the work, and closed the loop with a short summary. Consistency compounds. What helped you finish today?"
            : "Another step toward my goal today — learning in public, one session at a time. Sharing what I studied and how I'm applying it in practice.",
      },
      {
        topic: "Consistency over intensity",
        draft:
          "This week I keep relearning the same lesson: consistency beats intensity. Showing up for the session matters more than a perfect plan. What keeps your streak alive?",
      },
    ],
  });

  try {
    const result = await runStructured({
      system: mode === "evening" ? EVENING_POST_SYSTEM : POST_SYSTEM,
      user:
        mode === "evening"
          ? buildEveningPostUserMessage({ memory, context })
          : buildPostUserMessage({ memory, context }),
      schema: postIdeasSchema,
      fallback,
      temperature: 0.85,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
