import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/ai/aiAuthServer";
import { runStructured } from "@/lib/ai/run";
import { WEEKLY_PROGRESS_SYSTEM, buildWeeklyProgressUserMessage } from "@/lib/ai/prompts";
import { weeklyProgressReportSchema, type WeeklyProgressReport } from "@/lib/ai/schemas";
import { normalizeMemory } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = guardAiRequest(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const memory = normalizeMemory(body?.memory);
  const goal =
    body?.goal && typeof body.goal === "object"
      ? { title: String(body.goal.title ?? ""), targetHours: Number(body.goal.targetHours) || 0 }
      : { title: "", targetHours: 0 };
  const weekLabel = typeof body?.weekLabel === "string" ? body.weekLabel : "This week";
  const calendarSessions = Array.isArray(body?.calendarSessions) ? body.calendarSessions : [];
  const dailyLogs = Array.isArray(body?.dailyLogs) ? body.dailyLogs : [];
  const learningHoursByDay = Array.isArray(body?.learningHoursByDay) ? body.learningHoursByDay : [];

  const totalH = calendarSessions.reduce(
    (a: number, s: { durationHours?: number; category?: string }) =>
      s.category === "learning" ? a + (s.durationHours ?? 0) : a,
    0
  );

  const fallback = (): WeeklyProgressReport => ({
    summary:
      totalH > 0
        ? `This week you logged ${totalH.toFixed(1)}h of learning across ${calendarSessions.length} completed sessions. Keep building momentum toward your goal.`
        : "Not much calendar data this week. Mark completed learning sessions on the Calendar tab and add daily notes.",
    totalLearningHours: Math.round(totalH * 10) / 10,
    highlights: totalH > 0 ? [`${totalH.toFixed(1)}h of focused learning`] : [],
    topicsStudied: calendarSessions
      .filter((s: { category?: string }) => s.category === "learning")
      .slice(0, 5)
      .map((s: { title?: string }) => String(s.title ?? "")),
    dynamics: totalH > 0 ? "Steady progress — review which days had the most depth." : "Start logging sessions to see weekly trends.",
    strengths: totalH >= 5 ? ["Consistent calendar tracking"] : ["Room to grow — small daily sessions add up"],
    improvements: ["Add notes to calendar events for richer AI analysis"],
    nextWeekFocus: ["1–2h focused learning per day", "End each day with a short note on Progress"],
  });

  try {
    const result = await runStructured({
      system: WEEKLY_PROGRESS_SYSTEM,
      user: buildWeeklyProgressUserMessage({
        memory,
        goal,
        weekLabel,
        calendarSessions,
        dailyLogs,
        learningHoursByDay,
      }),
      schema: weeklyProgressReportSchema,
      fallback,
      temperature: 0.5,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
