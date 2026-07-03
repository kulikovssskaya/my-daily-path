import { NextResponse } from "next/server";
import { runStructured } from "@/lib/ai/run";
import { PROGRESS_SYSTEM, buildProgressUserMessage } from "@/lib/ai/prompts";
import { progressReportSchema, type ProgressReport } from "@/lib/ai/schemas";
import { normalizeMemory } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const memory = normalizeMemory(body?.memory);
  const tracks = Array.isArray(body?.tracks) ? body.tracks : [];
  const applicationsByStatus =
    body?.applicationsByStatus && typeof body.applicationsByStatus === "object"
      ? body.applicationsByStatus
      : {};
  const recentLearning = Array.isArray(body?.recentLearning) ? body.recentLearning : [];
  const dailyLogs = Array.isArray(body?.dailyLogs) ? body.dailyLogs : [];

  const fallback = (): ProgressReport => {
    const totalHours = tracks.reduce(
      (a: number, t: { loggedHours?: number }) => a + (t.loggedHours ?? 0),
      0
    );
    return {
      summary:
        totalHours > 0
          ? `Great work — ${totalHours.toFixed(
              1
            )}h of learning in total. Keep the rhythm; every day gets you closer to the ML goal.`
          : "Not much data yet. Mark completed sessions in the schedule and I'll start tracking progress.",
      recommendations: [
        "Mark completed learning events on the Schedule tab.",
        "Aim for 1–2 hours of focused learning per day.",
      ],
      focusMore: ["Hands-on practice and ML projects"],
      focusLess: ["Passive reading without applying it"],
    };
  };

  try {
    const result = await runStructured({
      system: PROGRESS_SYSTEM,
      user: buildProgressUserMessage({
        memory,
        tracks,
        applicationsByStatus,
        recentLearning,
        dailyLogs,
      }),
      schema: progressReportSchema,
      fallback,
      temperature: 0.6,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
