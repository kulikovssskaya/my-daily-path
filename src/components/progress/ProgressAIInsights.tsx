"use client";

import * as React from "react";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  CalendarRange,
  BookOpen,
} from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCareerStore } from "@/stores/careerStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { computeTrackStats } from "@/lib/progress";
import {
  enrichEventsForAI,
  getWeekBounds,
  eventsInRange,
  logsInRange,
  dailyMetrics,
} from "@/lib/progressAnalytics";
import { postAI } from "@/lib/aiClient";
import type { ProgressReport, WeeklyProgressReport } from "@/lib/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProgressAIInsights() {
  const tracks = useProgressStore((s) => s.tracks);
  const reports = useProgressStore((s) => s.reports);
  const weeklyReports = useProgressStore((s) => s.weeklyReports);
  const addReport = useProgressStore((s) => s.addReport);
  const addWeeklyReport = useProgressStore((s) => s.addWeeklyReport);
  const goal = useProgressStore((s) => s.goal);
  const logs = useProgressStore((s) => s.logs);
  const events = useScheduleStore((s) => s.events);
  const applications = useCareerStore((s) => s.applications);

  const [dailyLoading, setDailyLoading] = React.useState(false);
  const [weeklyLoading, setWeeklyLoading] = React.useState(false);
  const [dailyReport, setDailyReport] = React.useState<ProgressReport | null>(null);
  const [weeklyReport, setWeeklyReport] = React.useState<WeeklyProgressReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const weekBounds = React.useMemo(() => getWeekBounds(), []);
  const weekLabel = `${weekBounds.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekBounds.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const existingWeekly = weeklyReports.find((w) => w.weekKey === weekBounds.weekKey);

  const generateDaily = async () => {
    setDailyLoading(true);
    setError(null);
    try {
      const memory = useMemoryStore.getState().snapshot();
      const trackStats = tracks.map((t) => {
        const s = computeTrackStats(events, t);
        return {
          name: t.name,
          type: t.type,
          loggedHours: s.loggedHours,
          targetHours: t.targetHours,
          streak: s.streak,
        };
      });
      const applicationsByStatus = applications.reduce<Record<string, number>>((acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      }, {});
      const recentLearning = events
        .filter((e) => e.status === "done" && e.category === "learning")
        .slice(-8)
        .map((e) => ({ title: e.title, track: e.meta?.track, date: e.start.slice(0, 10) }));
      const dailyLogs = logs.slice(0, 20).map((l) => ({ date: l.date, text: l.text }));
      const calendarSessions = enrichEventsForAI(events, 40);

      const res = await postAI<{ data: ProgressReport; usedFallback: boolean }>("/api/ai/progress", {
        memory,
        tracks: trackStats,
        applicationsByStatus,
        recentLearning,
        dailyLogs,
        calendarSessions,
      });
      setDailyReport(res.data);
      addReport({
        date: new Date().toISOString(),
        summary: res.data.summary,
        recommendations: res.data.recommendations,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate report.");
    } finally {
      setDailyLoading(false);
    }
  };

  const generateWeekly = async () => {
    setWeeklyLoading(true);
    setError(null);
    try {
      const memory = useMemoryStore.getState().snapshot();
      const weekEvents = eventsInRange(events, weekBounds.startKey, weekBounds.endKey);
      const calendarSessions = enrichEventsForAI(weekEvents, 100);
      const weekLogs = logsInRange(logs, weekBounds.startKey, weekBounds.endKey).map((l) => ({
        date: l.date,
        text: l.text,
      }));
      const learningHoursByDay = dailyMetrics(weekEvents, 7, weekBounds.end).map((d) => ({
        date: d.key,
        hours: d.learningHours,
      }));

      const res = await postAI<{ data: WeeklyProgressReport; usedFallback: boolean }>(
        "/api/ai/progress/weekly",
        {
          memory,
          goal,
          weekLabel,
          calendarSessions,
          dailyLogs: weekLogs,
          learningHoursByDay,
        }
      );
      setWeeklyReport(res.data);
      addWeeklyReport({
        weekKey: weekBounds.weekKey,
        weekLabel,
        date: new Date().toISOString(),
        summary: res.data.summary,
        totalLearningHours: res.data.totalLearningHours,
        highlights: res.data.highlights,
        topicsStudied: res.data.topicsStudied,
        dynamics: res.data.dynamics,
        strengths: res.data.strengths,
        improvements: res.data.improvements,
        nextWeekFocus: res.data.nextWeekFocus,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate weekly report.");
    } finally {
      setWeeklyLoading(false);
    }
  };

  const displayWeekly = weeklyReport ?? existingWeekly;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <CardTitle className="text-sm">AI analysis</CardTitle>
              <p className="text-xs text-muted-foreground">
                Reads calendar sessions (titles, times, notes) + your daily notes
              </p>
            </div>
          </div>
          <Button size="sm" onClick={generateDaily} disabled={dailyLoading}>
            {dailyLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Today
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          {dailyReport ? (
            <>
              <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm">{dailyReport.summary}</p>
              {dailyReport.recommendations.length > 0 && (
                <ul className="space-y-1.5">
                  {dailyReport.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-primary">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {dailyReport.focusMore.length > 0 && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="size-3.5" /> Focus more
                    </div>
                    <ul className="space-y-1 text-sm">
                      {dailyReport.focusMore.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {dailyReport.focusLess.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <TrendingDown className="size-3.5" /> Reduce
                    </div>
                    <ul className="space-y-1 text-sm">
                      {dailyReport.focusLess.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Analyze today — AI reviews calendar data and your notes.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-violet-500/20">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <CalendarRange className="size-4" />
            </span>
            <div>
              <CardTitle className="text-sm">Weekly summary</CardTitle>
              <p className="text-xs text-muted-foreground">{weekLabel}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={generateWeekly} disabled={weeklyLoading}>
            {weeklyLoading ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
            {displayWeekly ? "Refresh" : "Generate"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayWeekly ? (
            <>
              <p className="rounded-lg bg-violet-500/5 px-3 py-2 text-sm">{displayWeekly.summary}</p>
              {displayWeekly.totalLearningHours != null && (
                <p className="text-xs text-muted-foreground">
                  {displayWeekly.totalLearningHours.toFixed(1)}h learning this week
                </p>
              )}
              {displayWeekly.dynamics && (
                <div className="rounded-lg border p-3 text-sm">
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">Dynamics</div>
                  {displayWeekly.dynamics}
                </div>
              )}
              {displayWeekly.highlights.length > 0 && (
                <Section title="Highlights" items={displayWeekly.highlights} />
              )}
              {displayWeekly.topicsStudied.length > 0 && (
                <Section title="Topics studied" items={displayWeekly.topicsStudied} />
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {displayWeekly.strengths.length > 0 && (
                  <Section title="Strengths" items={displayWeekly.strengths} className="text-emerald-700 dark:text-emerald-400" />
                )}
                {displayWeekly.improvements.length > 0 && (
                  <Section title="Improve" items={displayWeekly.improvements} className="text-amber-700 dark:text-amber-400" />
                )}
              </div>
              {displayWeekly.nextWeekFocus.length > 0 && (
                <Section title="Next week focus" items={displayWeekly.nextWeekFocus} />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              At the end of the week, generate a full wrap-up from calendar + notes.
            </p>
          )}

          {weeklyReports.length > 1 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Previous weeks ({weeklyReports.length - 1})
              </summary>
              <ul className="mt-2 space-y-2">
                {weeklyReports
                  .filter((w) => w.weekKey !== weekBounds.weekKey)
                  .map((w) => (
                    <li key={w.id} className="rounded-lg border p-2">
                      <div className="text-[11px] font-medium text-muted-foreground">{w.weekLabel}</div>
                      {w.summary}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground px-1">
            Daily report history ({reports.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {reports.slice(0, 10).map((r) => (
              <li key={r.id} className="rounded-lg border p-2">
                <div className="text-[11px] text-muted-foreground">
                  {new Date(r.date).toLocaleDateString("en-US")}
                </div>
                {r.summary}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  className,
}: {
  title: string;
  items: string[];
  className?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className={`mb-1 text-xs font-semibold ${className ?? "text-muted-foreground"}`}>{title}</div>
      <ul className="space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
