import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/ai/aiAuthServer";
import { runStructured } from "@/lib/ai/run";
import { APPLICATION_SYSTEM, buildApplicationUserMessage } from "@/lib/ai/prompts";
import { applicationResponseSchema } from "@/lib/ai/schemas";
import { normalizeMemory } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = guardAiRequest(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const cvMarkdown: string = typeof body?.cvMarkdown === "string" ? body.cvMarkdown : "";
  const job = {
    title: body?.job?.title ?? "",
    company: body?.job?.company ?? "",
    description: body?.job?.description ?? "",
  };
  const memory = normalizeMemory(body?.memory);

  if (!job.title) {
    return NextResponse.json({ error: "No job specified." }, { status: 400 });
  }

  const fallback = () => ({
    adaptedCV:
      cvMarkdown ||
      `# CV\n\nTailor this resume for the **${job.title}** role at ${job.company}.\n(Add an AI key for automatic adaptation.)`,
    coverLetter: `Hello,\n\nI'm excited about the "${job.title}" position at ${job.company}. I'm actively growing in this area and would love to contribute to your team.\n\nBest regards.`,
    tips: [
      "Add measurable results (project metrics).",
      "Highlight the skills mentioned in the job description.",
    ],
  });

  try {
    const result = await runStructured({
      system: APPLICATION_SYSTEM,
      user: buildApplicationUserMessage({ cvMarkdown, job, memory }),
      schema: applicationResponseSchema,
      fallback,
      temperature: 0.7,
      maxTokens: 3000,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
