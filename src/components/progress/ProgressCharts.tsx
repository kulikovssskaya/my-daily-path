"use client";

import * as React from "react";
import { BarChart3, PieChart, TrendingUp, Flame, Clock, CalendarCheck } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import {
  dailyMetrics,
  hoursByCategory,
  hoursByTrack,
  weeklyLearningTrend,
  totalLearningHours,
  learningStreak,
  dateKey,
  learningHoursInRange,
} from "@/lib/progressAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_META } from "@/lib/categories";

const CATEGORY_COLORS: Record<string, string> = {
  learning: "bg-violet-500",
  work: "bg-blue-500",
  health: "bg-emerald-500",
  meal: "bg-amber-500",
  rest: "bg-slate-400",
  commute: "bg-cyan-500",
  habit: "bg-pink-500",
  other: "bg-zinc-400",
};

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-none">{value}</div>
          <div className="truncate text-[11px] text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarChart({ data, maxHeight = 100 }: { data: { label: string; value: number; key: string }[]; maxHeight?: number }) {
  const max = Math.max(0.1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: maxHeight + 28 }}>
      {data.map((d) => (
        <div key={d.key} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-muted-foreground">{d.value > 0 ? d.value.toFixed(1) : ""}</span>
          <div
            className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all"
            style={{ height: `${(d.value / max) * maxHeight}px`, minHeight: d.value > 0 ? 4 : 2 }}
          />
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ProgressOverview() {
  const events = useScheduleStore((s) => s.events);
  const weekAgo = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return dateKey(d);
  }, []);

  const weekHours = totalLearningHours(events, weekAgo);
  const streak = learningStreak(events);
  const sessionsWeek = events.filter(
    (e) => e.status === "done" && e.category === "learning" && e.start.slice(0, 10) >= weekAgo
  ).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile icon={Clock} label="Learning / 7d" value={`${weekHours.toFixed(1)}h`} />
      <StatTile icon={Flame} label="Streak" value={`${streak}d`} />
      <StatTile icon={CalendarCheck} label="Sessions / 7d" value={`${sessionsWeek}`} />
      <StatTile icon={TrendingUp} label="All-time learning" value={`${totalLearningHours(events).toFixed(0)}h`} />
    </div>
  );
}

export function ProgressCharts() {
  const events = useScheduleStore((s) => s.events);

  const daily7 = React.useMemo(() => dailyMetrics(events, 7), [events]);
  const weeklyTrend = React.useMemo(() => weeklyLearningTrend(events, 4), [events]);
  const byCategory = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return hoursByCategory(events, dateKey(d));
  }, [events]);
  const byTrack = React.useMemo(() => hoursByTrack(events), [events]);

  const weekAgo = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return dateKey(d);
  }, []);
  const prevWeekEnd = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return dateKey(d);
  }, []);
  const prevWeekStart = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return dateKey(d);
  }, []);
  const thisWeekH = learningHoursInRange(events, weekAgo, dateKey(new Date()));
  const prevWeekH = learningHoursInRange(events, prevWeekStart, prevWeekEnd);
  const trendPct = prevWeekH > 0 ? Math.round(((thisWeekH - prevWeekH) / prevWeekH) * 100) : null;

  const catMax = Math.max(0.1, ...byCategory.map((c) => c.hours));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
          <BarChart3 className="size-4 text-primary" />
          <CardTitle className="text-sm">Daily learning (7 days)</CardTitle>
          {trendPct !== null && (
            <span className={`ml-auto text-xs ${trendPct >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
              {trendPct >= 0 ? "+" : ""}{trendPct}% vs prev week
            </span>
          )}
        </CardHeader>
        <CardContent>
          <BarChart
            data={daily7.map((d) => ({ key: d.key, label: d.label, value: d.learningHours }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
          <TrendingUp className="size-4 text-primary" />
          <CardTitle className="text-sm">Weekly trend (4 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            maxHeight={90}
            data={weeklyTrend.map((w) => ({ key: w.weekKey, label: w.label, value: w.learningHours }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
          <PieChart className="size-4 text-primary" />
          <CardTitle className="text-sm">Time by category (30 days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed events yet.</p>
          ) : (
            byCategory.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{CATEGORY_META[c.category]?.label ?? c.category}</span>
                  <span className="text-muted-foreground">{c.hours.toFixed(1)}h · {c.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[c.category] ?? "bg-primary"}`}
                    style={{ width: `${(c.hours / catMax) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
          <BarChart3 className="size-4 text-primary" />
          <CardTitle className="text-sm">Learning by track</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byTrack.length === 0 ? (
            <p className="text-sm text-muted-foreground">Mark learning events done on Calendar.</p>
          ) : (
            byTrack.slice(0, 8).map((t) => {
              const max = byTrack[0]?.hours ?? 1;
              return (
                <div key={t.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground">{t.hours.toFixed(1)}h · {t.sessions} sessions</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary"
                      style={{ width: `${(t.hours / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
