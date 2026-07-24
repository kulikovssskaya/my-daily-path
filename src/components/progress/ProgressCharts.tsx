"use client";

import * as React from "react";
import { BarChart3, TrendingUp, Flame, Clock, CalendarCheck, BookOpen } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import {
  dailyMetrics,
  hoursByTrack,
  weeklyLearningTrend,
  totalLearningHours,
  learningStreak,
  dateKey,
  learningHoursInRange,
  eventDurationHours,
  inferTrackFromTitle,
} from "@/lib/progressAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-none">{value}</div>
          <div className="truncate text-[11px] text-muted-foreground">{label}</div>
          {hint ? (
            <div className="truncate text-[10px] text-muted-foreground/80">{hint}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function BarChart({
  data,
  maxHeight = 100,
}: {
  data: { label: string; value: number; key: string }[];
  maxHeight?: number;
}) {
  const max = Math.max(0.1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: maxHeight + 28 }}>
      {data.map((d) => (
        <div key={d.key} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-muted-foreground">
            {d.value > 0 ? d.value.toFixed(1) : ""}
          </span>
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

function useWeekBounds() {
  return React.useMemo(() => {
    const today = dateKey(new Date());
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekAgo = dateKey(weekStart);

    const prevEnd = new Date();
    prevEnd.setDate(prevEnd.getDate() - 7);
    const prevWeekEnd = dateKey(prevEnd);

    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - 13);
    const prevWeekStart = dateKey(prevStart);

    return { today, weekAgo, prevWeekStart, prevWeekEnd };
  }, []);
}

export function ProgressOverview() {
  const events = useScheduleStore((s) => s.events);
  const { today, weekAgo, prevWeekStart, prevWeekEnd } = useWeekBounds();

  const todayHours = learningHoursInRange(events, today, today);
  const weekHours = totalLearningHours(events, weekAgo);
  const streak = learningStreak(events);
  const sessionsWeek = events.filter(
    (e) => e.status === "done" && e.category === "learning" && e.start.slice(0, 10) >= weekAgo
  ).length;
  const allTime = totalLearningHours(events);
  const prevWeekH = learningHoursInRange(events, prevWeekStart, prevWeekEnd);
  const trendPct = prevWeekH > 0 ? Math.round(((weekHours - prevWeekH) / prevWeekH) * 100) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Clock}
          label="Today"
          value={`${todayHours.toFixed(1)}h`}
          hint="done Learning today"
        />
        <StatTile
          icon={CalendarCheck}
          label="This week"
          value={`${weekHours.toFixed(1)}h`}
          hint={
            trendPct !== null
              ? `${trendPct >= 0 ? "+" : ""}${trendPct}% vs prev 7d · ${sessionsWeek} sessions`
              : `${sessionsWeek} sessions · last 7 days`
          }
        />
        <StatTile
          icon={Flame}
          label="Streak"
          value={`${streak}d`}
          hint="days in a row with learning"
        />
        <StatTile
          icon={TrendingUp}
          label="All time"
          value={`${allTime.toFixed(0)}h`}
          hint="all done Learning events"
        />
      </div>
    </div>
  );
}

export function ProgressByActivity() {
  const events = useScheduleStore((s) => s.events);
  const { weekAgo } = useWeekBounds();

  const byTrack = React.useMemo(() => hoursByTrack(events), [events]);
  const weekByTrack = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      if (e.status !== "done" || e.category !== "learning") continue;
      if (e.start.slice(0, 10) < weekAgo) continue;
      const name = e.meta?.track?.trim() || inferTrackFromTitle(e.title);
      map.set(name, (map.get(name) ?? 0) + eventDurationHours(e));
    }
    return map;
  }, [events, weekAgo]);

  const total = byTrack.reduce((a, t) => a + t.hours, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <BookOpen className="size-4 text-primary" />
          <div>
            <CardTitle className="text-sm">By activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              Grouped from calendar titles / track (e.g. Python, With dad). Week = last 7 days.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {byTrack.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed Learning events yet. Add sessions on Calendar and mark them done.
          </p>
        ) : (
          byTrack.map((t) => {
            const max = byTrack[0]?.hours ?? 1;
            const weekH = weekByTrack.get(t.name) ?? 0;
            return (
              <div key={t.name} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium">{t.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {weekH.toFixed(1)}h this week · {t.hours.toFixed(1)}h all · {t.sessions}{" "}
                    sessions
                  </span>
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
        {total > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Tip: put “папа / dad” or “Python / Stepik” in the event title so activities split
            correctly.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ProgressCharts() {
  const events = useScheduleStore((s) => s.events);

  const daily7 = React.useMemo(() => dailyMetrics(events, 7), [events]);
  const weeklyTrend = React.useMemo(() => weeklyLearningTrend(events, 4), [events]);

  const { weekAgo, prevWeekStart, prevWeekEnd } = useWeekBounds();
  const thisWeekH = totalLearningHours(events, weekAgo);
  const prevWeekH = learningHoursInRange(events, prevWeekStart, prevWeekEnd);
  const trendPct = prevWeekH > 0 ? Math.round(((thisWeekH - prevWeekH) / prevWeekH) * 100) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
          <BarChart3 className="size-4 text-primary" />
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">Daily learning</CardTitle>
            <p className="text-xs text-muted-foreground">Last 7 days · Learning category only</p>
          </div>
          {trendPct !== null && (
            <span className={`text-xs ${trendPct >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
              {trendPct >= 0 ? "+" : ""}
              {trendPct}% vs prev week
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
        <CardHeader className="space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-4 text-primary" />
            <div>
              <CardTitle className="text-sm">Weekly trend</CardTitle>
              <p className="text-xs text-muted-foreground">Learning hours per calendar week</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BarChart
            maxHeight={90}
            data={weeklyTrend.map((w) => ({
              key: w.weekKey,
              label: w.label,
              value: w.learningHours,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
