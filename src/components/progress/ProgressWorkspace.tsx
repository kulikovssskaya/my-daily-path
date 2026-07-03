"use client";

import * as React from "react";
import {
  Target,
  Flame,
  GraduationCap,
  Send,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Brain,
  Clock,
  CalendarCheck,
  BarChart3,
  NotebookPen,
  Undo2,
  Pencil,
  Check,
  X,
  LockOpen,
} from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCareerStore } from "@/stores/careerStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { computeTrackStats, totalLearningHours } from "@/lib/progress";
import { postAI } from "@/lib/aiClient";
import type { ProgressReport } from "@/lib/ai/schemas";
import type { TrackType, Pace } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ExportDataCard } from "@/components/progress/ExportDataCard";
import { toNaiveISO } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/useMounted";

// ---------- Overview stat tiles ----------
function OverviewCard() {
  const tracks = useProgressStore((s) => s.tracks);
  const events = useScheduleStore((s) => s.events);
  const applications = useCareerStore((s) => s.applications);

  const total = totalLearningHours(events, tracks);
  const bestStreak = tracks.reduce(
    (m, t) => Math.max(m, computeTrackStats(events, t).streak),
    0
  );

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekKey = weekAgo.toISOString().slice(0, 10);
  const sessionsThisWeek = events.filter(
    (e) => e.status === "done" && e.category === "learning" && e.start.slice(0, 10) >= weekKey
  ).length;

  const stats = [
    { icon: Clock, label: "Total hours", value: total.toFixed(1) },
    { icon: Flame, label: "Best streak", value: `${bestStreak}d` },
    { icon: CalendarCheck, label: "Sessions / 7d", value: `${sessionsThisWeek}` },
    { icon: Send, label: "Applications", value: `${applications.length}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <s.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="text-lg font-semibold leading-none">{s.value}</div>
              <div className="truncate text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- 7-day learning activity ----------
function WeeklyActivityCard() {
  const events = useScheduleStore((s) => s.events);

  const days = React.useMemo(() => {
    const arr: { label: string; key: string; hours: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      arr.push({ label: d.toLocaleDateString("en-US", { weekday: "short" }), key, hours: 0 });
    }
    for (const e of events) {
      if (e.status !== "done" || e.category !== "learning") continue;
      const day = arr.find((a) => a.key === e.start.slice(0, 10));
      if (day) {
        const h = (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3_600_000;
        if (h > 0) day.hours += h;
      }
    }
    return arr;
  }, [events]);

  const max = Math.max(1, ...days.map((d) => d.hours));

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <BarChart3 className="size-4" />
        </span>
        <CardTitle className="text-sm">Learning activity (last 7 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
          {days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-muted-foreground">
                {d.hours > 0 ? d.hours.toFixed(1) : ""}
              </span>
              <div
                className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all"
                style={{ height: `${(d.hours / max) * 90}px`, minHeight: d.hours > 0 ? 4 : 2 }}
              />
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DailyLogCard() {
  const logs = useProgressStore((s) => s.logs);
  const addLog = useProgressStore((s) => s.addLog);
  const updateLog = useProgressStore((s) => s.updateLog);
  const removeLog = useProgressStore((s) => s.removeLog);
  const unlockLog = useProgressStore((s) => s.unlockLog);
  const undoLogs = useProgressStore((s) => s.undoLogs);
  const canUndoLogs = useProgressStore((s) => s.canUndoLogs);
  const addEvent = useScheduleStore((s) => s.addEvent);
  const removeEvent = useScheduleStore((s) => s.removeEvent);
  const updateEvent = useScheduleStore((s) => s.updateEvent);
  const [text, setText] = React.useState("");
  const [toCalendar, setToCalendar] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");

  const save = () => {
    const t = text.trim();
    if (!t) return;
    let calendarEventId: string | undefined;
    if (toCalendar) {
      const now = new Date();
      const start = new Date(now.getTime() - 15 * 60000);
      calendarEventId = addEvent({
        title: t.length > 60 ? t.slice(0, 60) + "…" : t,
        category: "other",
        start: toNaiveISO(start),
        end: toNaiveISO(now),
        status: "done",
        priority: 3,
      });
    }
    addLog(t, calendarEventId);
    setText("");
  };

  const handleUndo = () => {
    const result = undoLogs();
    if (!result) return;
    for (const id of result.removeCalendarEventIds) {
      removeEvent(id);
    }
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditText(current);
  };

  const saveEdit = (id: string, calendarEventId?: string) => {
    const t = editText.trim();
    if (!t) return;
    updateLog(id, t);
    if (calendarEventId) {
      updateEvent(calendarEventId, {
        title: t.length > 60 ? t.slice(0, 60) + "…" : t,
      });
    }
    setEditingId(null);
    setEditText("");
  };

  const handleRemove = (id: string, calendarEventId?: string) => {
    removeLog(id);
    if (calendarEventId) removeEvent(calendarEventId);
  };

  const recent = logs.slice(0, 12);
  const canUndo = canUndoLogs();

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <NotebookPen className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm">What did you do today?</CardTitle>
          <p className="text-xs text-muted-foreground">
            Saved daily and used by the AI report. Optionally logged to the calendar.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo last change"
        >
          <Undo2 className="size-4" />
          Undo
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
          }}
          rows={3}
          placeholder="e.g. Finished pandas groupby, solved 5 tasks, watched 1 lecture on cross-validation"
          className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={toCalendar}
              onChange={(e) => setToCalendar(e.target.checked)}
            />
            Also add to calendar
          </label>
          <Button onClick={save} disabled={!text.trim()} className="ml-auto">
            <Plus className="size-4" />
            Save entry
          </Button>
        </div>

        {recent.length > 0 && (
          <ul className="space-y-1.5">
            {recent.map((l) => (
              <li
                key={l.id}
                className={cn(
                  "flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                  l.locked && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                {editingId === l.id && !l.locked ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full resize-y rounded border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveEdit(l.id, l.calendarEventId)}
                        disabled={!editText.trim()}
                      >
                        <Check className="size-3.5" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <span className="mr-2 text-[11px] text-muted-foreground">
                        {new Date(l.date).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      {l.text}
                      {l.locked && (
                        <span className="ml-2 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          · saved
                        </span>
                      )}
                      {l.calendarEventId && (
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          · calendar
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {l.locked ? (
                        <button
                          onClick={() => unlockLog(l.id)}
                          className="text-amber-700 hover:text-amber-900 dark:text-amber-400"
                          title="Unlock to edit"
                        >
                          <LockOpen className="size-3.5" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(l.id, l.text)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemove(l.id, l.calendarEventId)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GoalCard() {
  const goal = useProgressStore((s) => s.goal);
  const tracks = useProgressStore((s) => s.tracks);
  const events = useScheduleStore((s) => s.events);

  const mlTrack = tracks.find((t) => t.type === "ml");
  const mlHours = mlTrack ? computeTrackStats(events, mlTrack).loggedHours : 0;
  const pct = goal.targetHours ? (mlHours / goal.targetHours) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Long-term goal
            </p>
            <h3 className="text-sm font-semibold">{goal.title}</h3>
          </div>
        </div>
        <Progress value={pct} indicatorClassName="bg-gradient-to-r from-violet-500 to-primary" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{mlHours.toFixed(1)}h of ML</span>
          <span>
            {Math.round(pct)}% of {goal.targetHours}h
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LogButtons({ trackName }: { trackName: string }) {
  const addEvent = useScheduleStore((s) => s.addEvent);
  const [custom, setCustom] = React.useState("");

  const log = (minutes: number) => {
    if (minutes <= 0) return;
    const now = new Date();
    const end = new Date(now.getTime() + minutes * 60000);
    addEvent({
      title: `${trackName} study`,
      category: "learning",
      start: toNaiveISO(now),
      end: toNaiveISO(end),
      status: "done",
      priority: 2,
      meta: { track: trackName },
    });
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">Log:</span>
      <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={() => log(30)}>
        +30m
      </Button>
      <Button variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={() => log(60)}>
        +1h
      </Button>
      <input
        type="number"
        min={5}
        step={5}
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        placeholder="min"
        className="h-7 w-16 rounded-md border bg-background px-2 text-xs"
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => {
          const m = parseInt(custom, 10);
          if (m > 0) {
            log(m);
            setCustom("");
          }
        }}
      >
        Add
      </Button>
    </div>
  );
}

function TracksSection() {
  const tracks = useProgressStore((s) => s.tracks);
  const addTrack = useProgressStore((s) => s.addTrack);
  const removeTrack = useProgressStore((s) => s.removeTrack);
  const events = useScheduleStore((s) => s.events);

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<TrackType>("programming");

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <GraduationCap className="size-4" />
        </span>
        <div>
          <CardTitle className="text-sm">Learning tracks</CardTitle>
          <p className="text-xs text-muted-foreground">
            Hours come from completed learning events — or log time directly below
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tracks.map((t) => {
          const stats = computeTrackStats(events, t);
          const pct = t.targetHours ? (stats.loggedHours / t.targetHours) * 100 : 0;
          return (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.name}</span>
                  {stats.streak > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <Flame className="size-3" />
                      {stats.streak}d
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {stats.loggedHours.toFixed(1)}
                    {t.targetHours ? ` / ${t.targetHours}` : ""} h
                  </span>
                  <button
                    onClick={() => removeTrack(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete track"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <Progress value={pct} />
              <LogButtons trackName={t.name} />
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New track (e.g. Statistics)"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TrackType)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="language">Language</option>
            <option value="programming">Programming</option>
            <option value="ml">ML</option>
            <option value="other">Other</option>
          </select>
          <Button
            onClick={() => {
              if (!name.trim()) return;
              addTrack(name.trim(), type, 50);
              setName("");
            }}
            disabled={!name.trim()}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationsCard() {
  const applications = useCareerStore((s) => s.applications);
  const counts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const labels: Record<string, string> = {
    saved: "Saved",
    preparing: "Preparing",
    applied: "Applied",
    interview: "Interview",
    rejected: "Rejected",
    offer: "Offer",
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Send className="size-4" />
        </span>
        <CardTitle className="text-sm">Job applications</CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No applications yet. Create them on the Work / Career tab.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(labels).map(([k, l]) => (
              <div key={k} className="rounded-lg border p-2 text-center">
                <div className="text-lg font-semibold">{counts[k] ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DailyReportCard() {
  const tracks = useProgressStore((s) => s.tracks);
  const reports = useProgressStore((s) => s.reports);
  const addReport = useProgressStore((s) => s.addReport);
  const logs = useProgressStore((s) => s.logs);
  const events = useScheduleStore((s) => s.events);
  const applications = useCareerStore((s) => s.applications);

  const [loading, setLoading] = React.useState(false);
  const [report, setReport] = React.useState<ProgressReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
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

      const res = await postAI<{ data: ProgressReport; usedFallback: boolean }>(
        "/api/ai/progress",
        { memory, tracks: trackStats, applicationsByStatus, recentLearning, dailyLogs }
      );
      const data = res.data;

      setReport(data);
      addReport({
        date: new Date().toISOString(),
        summary: data.summary,
        recommendations: data.recommendations,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <CardTitle className="text-sm">Daily AI report</CardTitle>
        </div>
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Analyze day
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        {report ? (
          <>
            <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm">{report.summary}</p>
            {report.recommendations.length > 0 && (
              <ul className="space-y-1.5">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {report.focusMore.length > 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="size-3.5" /> Focus more
                  </div>
                  <ul className="space-y-1 text-sm">
                    {report.focusMore.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.focusLess.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <TrendingDown className="size-3.5" /> Reduce
                  </div>
                  <ul className="space-y-1 text-sm">
                    {report.focusLess.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Hit “Analyze day” — the AI reviews your progress and suggests what to focus on.
          </p>
        )}

        {reports.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Report history ({reports.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {reports.map((r) => (
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
      </CardContent>
    </Card>
  );
}

function PaceMemoryCard() {
  const notes = useMemoryStore((s) => s.notes);
  const addNote = useMemoryStore((s) => s.addNote);
  const removeNote = useMemoryStore((s) => s.removeNote);
  const setPace = useMemoryStore((s) => s.setPace);
  const [text, setText] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [pace, setPaceLocal] = React.useState<Pace>("normal");

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Brain className="size-4" />
        </span>
        <div>
          <CardTitle className="text-sm">Tell the AI about your pace</CardTitle>
          <p className="text-xs text-muted-foreground">
            Saved to memory and influences future plans
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                addNote(text.trim());
                setText("");
              }
            }}
            placeholder="e.g. “I'm slow at math” or “ready for neural networks”"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            onClick={() => {
              if (!text.trim()) return;
              addNote(text.trim());
              setText("");
            }}
            disabled={!text.trim()}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (e.g. math)"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <select
            value={pace}
            onChange={(e) => setPaceLocal(e.target.value as Pace)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="slow">slow</option>
            <option value="normal">normal</option>
            <option value="fast">fast</option>
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              if (!topic.trim()) return;
              setPace(topic.trim(), pace);
              setTopic("");
            }}
            disabled={!topic.trim()}
          >
            Set pace
          </Button>
        </div>

        {notes.length > 0 && (
          <ul className="space-y-1.5">
            {notes.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm"
              >
                <span>{n.text}</span>
                <button
                  onClick={() => removeNote(n.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ProgressWorkspace() {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-20 animate-pulse rounded-xl border bg-card" />
        <div className="h-28 animate-pulse rounded-xl border bg-card" />
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <OverviewCard />
      <DailyLogCard />
      <ExportDataCard />
      <GoalCard />
      <WeeklyActivityCard />
      <div className="grid gap-6 lg:grid-cols-2">
        <TracksSection />
        <ApplicationsCard />
      </div>
      <DailyReportCard />
      <PaceMemoryCard />
    </div>
  );
}
