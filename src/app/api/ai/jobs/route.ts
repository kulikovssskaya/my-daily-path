import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/ai/aiAuthServer";
import { runStructured } from "@/lib/ai/run";
import { JOBS_SYSTEM, buildJobsUserMessage } from "@/lib/ai/prompts";
import { jobsResponseSchema } from "@/lib/ai/schemas";
import { normalizeMemory } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = guardAiRequest(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const memory = normalizeMemory(body?.memory);
  const cvSummary: string = typeof body?.cvSummary === "string" ? body.cvSummary : "";
  const query: string = typeof body?.query === "string" ? body.query : "";

  const fallback = () => ({
    jobs: [
      {
        title: "Junior Machine Learning Engineer",
        company: "DataForge",
        location: "Remote",
        description:
          "Work with ML models, data preparation, training and evaluation. Python, pandas, scikit-learn.",
        matchScore: 82,
        source: "fallback",
      },
      {
        title: "ML Intern",
        company: "NeuroLabs",
        location: "Hybrid",
        description: "Internship: experiments with neural networks, PyTorch, research support.",
        matchScore: 74,
        source: "fallback",
      },
      {
        title: "Data Analyst (ML focus)",
        company: "InsightCo",
        location: "Remote",
        description: "Data analytics, basic ML models, visualization, SQL, Python.",
        matchScore: 68,
        source: "fallback",
      },
    ],
  });

  try {
    const result = await runStructured({
      system: JOBS_SYSTEM,
      user: buildJobsUserMessage({ memory, cvSummary, query }),
      schema: jobsResponseSchema,
      fallback,
      temperature: 0.7,
      maxTokens: 2500,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
