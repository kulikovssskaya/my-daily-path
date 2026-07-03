"use client";

import * as React from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  Square,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
} from "lucide-react";
import { useTimerStore, formatTimerMs, type PomodoroPhase } from "@/stores/timerStore";
import { useScheduleStore } from "@/stores/scheduleStore";
import { detectCurrentActivity } from "@/lib/currentActivity";
import { ensureNotificationPermission, notify, canNotify } from "@/lib/notifications";
import { playChime } from "@/lib/sounds";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import type { EventCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TimerSessionsPanel, persistSession } from "@/components/timer/TimerSessionsPanel";
import { MIN_TIMER_SESSION_MS } from "@/lib/timerSessions";

const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

export function WorkTimer() {
  const [open, setOpen] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showSessions, setShowSessions] = React.useState(false);
  const [, tick] = React.useState(0);

  const kind = useTimerStore((s) => s.kind);
  const setKind = useTimerStore((s) => s.setKind);
  const stopwatchRunning = useTimerStore((s) => s.stopwatchRunning);
  const startStopwatch = useTimerStore((s) => s.startStopwatch);
  const pauseStopwatch = useTimerStore((s) => s.pauseStopwatch);
  const resetStopwatch = useTimerStore((s) => s.resetStopwatch);
  const getStopwatchElapsedMs = useTimerStore((s) => s.getStopwatchElapsedMs);

  const pomodoroPhase = useTimerStore((s) => s.pomodoroPhase);
  const pomodoroRunning = useTimerStore((s) => s.pomodoroRunning);
  const pomodoroRound = useTimerStore((s) => s.pomodoroRound);
  const startPomodoro = useTimerStore((s) => s.startPomodoro);
  const pausePomodoro = useTimerStore((s) => s.pausePomodoro);
  const resetPomodoro = useTimerStore((s) => s.resetPomodoro);
  const getPomodoroRemainingMs = useTimerStore((s) => s.getPomodoroRemainingMs);
  const checkPomodoroComplete = useTimerStore((s) => s.checkPomodoroComplete);
  const advancePomodoroPhase = useTimerStore((s) => s.advancePomodoroPhase);

  const activityTitle = useTimerStore((s) => s.activityTitle);
  const activityCategory = useTimerStore((s) => s.activityCategory);
  const activityTrack = useTimerStore((s) => s.activityTrack);
  const autoDetect = useTimerStore((s) => s.autoDetect);
  const sessionStartedAt = useTimerStore((s) => s.sessionStartedAt);
  const setActivity = useTimerStore((s) => s.setActivity);
  const setAutoDetect = useTimerStore((s) => s.setAutoDetect);

  const settings = useTimerStore((s) => s.settings);
  const updateSettings = useTimerStore((s) => s.updateSettings);
  const notificationsOn = useTimerStore((s) => s.notificationsOn);
  const setNotificationsOn = useTimerStore((s) => s.setNotificationsOn);
  const soundOn = useTimerStore((s) => s.soundOn);
  const setSoundOn = useTimerStore((s) => s.setSoundOn);

  const events = useScheduleStore((s) => s.events);
  const habits = useScheduleStore((s) => s.habits);
  const activeSessionId = useTimerStore((s) => s.activeSessionId);
  const sessions = useTimerStore((s) => s.sessions);
  const updateSession = useTimerStore((s) => s.updateSession);

  const isRunning = stopwatchRunning || pomodoroRunning;
  const elapsedMs = getStopwatchElapsedMs();
  const isActive = isRunning || elapsedMs > 0;

  // Tick display every second while running.
  React.useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // Auto-detect activity from schedule (stable callback via getState).
  React.useEffect(() => {
    const run = () => {
      const { autoDetect: auto, applyDetected } = useTimerStore.getState();
      if (!auto) return;
      const detected = detectCurrentActivity(new Date(), events, habits);
      if (detected) {
        applyDetected(detected.title, detected.category, detected.track);
      }
    };
    run();
    const id = setInterval(run, 30_000);
    return () => clearInterval(id);
  }, [events, habits]);

  // Pomodoro phase completion.
  React.useEffect(() => {
    if (!pomodoroRunning) return;
    const id = setInterval(() => {
      if (!checkPomodoroComplete()) return;
      const { pomodoroPhase: completedPhase, notificationsOn: notifyOn, soundOn: chimeOn } =
        useTimerStore.getState();

      if (notifyOn) {
        if (completedPhase === "focus") {
          notify("Focus session done", "Time for a break. Step away for a few minutes.", "pomodoro");
        } else {
          notify("Break is over", "Ready for another focus round?", "pomodoro");
        }
      }
      if (chimeOn) {
        playChime(completedPhase === "focus" ? "focus_done" : "break_done");
      }
      advancePomodoroPhase();
    }, 1000);
    return () => clearInterval(id);
  }, [pomodoroRunning, checkPomodoroComplete, advancePomodoroPhase]);

  const handleNotifyToggle = async () => {
    if (!notificationsOn) {
      const ok = await ensureNotificationPermission();
      setNotificationsOn(ok);
    } else {
      setNotificationsOn(false);
    }
  };

  const finishSession = () => {
    if (stopwatchRunning) pauseStopwatch();
    if (pomodoroRunning) pausePomodoro();

    const sessionMs =
      kind === "stopwatch"
        ? getStopwatchElapsedMs()
        : sessionStartedAt
          ? Date.now() - sessionStartedAt
          : 0;
    if (sessionMs < MIN_TIMER_SESSION_MS) return;

    const endedAt = Date.now();
    const { sessions: allSessions, activityTitle: title, activityCategory: cat } =
      useTimerStore.getState();
    let session = activeSessionId
      ? allSessions.find((s) => s.id === activeSessionId)
      : undefined;

    if (session) {
      session = {
        ...session,
        title: title.trim() || session.title,
        category: cat,
        track: activityTrack,
        endedAt,
      };
      updateSession(session.id, {
        title: session.title,
        category: session.category,
        track: session.track,
        endedAt,
      });
    }

    if (session && persistSession(session, endedAt, soundOn)) {
      resetStopwatch();
      resetPomodoro();
      setShowSessions(true);
    }
  };

  const canFinish =
    kind === "stopwatch"
      ? elapsedMs >= MIN_TIMER_SESSION_MS
      : !!sessionStartedAt && Date.now() - sessionStartedAt >= MIN_TIMER_SESSION_MS;

  const displayTime =
    kind === "stopwatch"
      ? formatTimerMs(elapsedMs)
      : formatTimerMs(getPomodoroRemainingMs());

  const running = kind === "stopwatch" ? stopwatchRunning : pomodoroRunning;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pb-[env(safe-area-inset-bottom)]">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition hover:bg-accent",
            isActive && "border-primary/40 ring-2 ring-primary/20"
          )}
        >
          <Timer className="size-4 text-primary" />
          <span className="tabular-nums">{displayTime}</span>
          {activityTitle && (
            <span className="max-w-[120px] truncate text-xs text-muted-foreground">
              · {activityTitle}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="pointer-events-auto w-[min(100vw-2rem,340px)] rounded-xl border bg-card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-primary" />
              <span className="text-sm font-semibold">Work timer</span>
            </div>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setOpen(false)}>
              <ChevronDown className="size-4" />
            </Button>
          </div>

          <div className="mb-3 flex rounded-lg border p-0.5">
            {(["stopwatch", "pomodoro"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-xs font-medium transition",
                  kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {k === "stopwatch" ? "Stopwatch" : "Pomodoro"}
              </button>
            ))}
          </div>

          <div className="mb-1 text-center text-3xl font-bold tabular-nums tracking-tight">
            {displayTime}
          </div>
          {kind === "pomodoro" && (
            <p className="mb-3 text-center text-xs text-muted-foreground">
              {PHASE_LABEL[pomodoroPhase]} · round {pomodoroRound}
            </p>
          )}

          <div className="mb-3 space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground">Activity</label>
            <input
              value={activityTitle}
              onChange={(e) =>
                setActivity(e.target.value, activityCategory, activityTrack || undefined)
              }
              placeholder="What are you working on?"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={activityCategory}
                onChange={(e) =>
                  setActivity(activityTitle, e.target.value as EventCategory, activityTrack || undefined)
                }
                className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs outline-none"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={(e) => setAutoDetect(e.target.checked)}
                />
                <Sparkles className="size-3" />
                Auto from schedule
              </label>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {kind === "stopwatch" ? (
              <>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={running ? pauseStopwatch : startStopwatch}
                >
                  {running ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {running ? "Pause" : "Start"}
                </Button>
                <Button size="sm" variant="outline" onClick={resetStopwatch} title="Reset">
                  <RotateCcw className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={running ? pausePomodoro : startPomodoro}
                >
                  {running ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {running ? "Pause" : "Start"}
                </Button>
                <Button size="sm" variant="outline" onClick={resetPomodoro} title="Reset">
                  <RotateCcw className="size-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={finishSession}
              disabled={!canFinish}
              title="Stop and save to calendar & daily log"
            >
              <Square className="size-3.5" />
              Finish & save
            </Button>
          </div>

          <div className="mb-3 border-t pt-3">
            <button
              type="button"
              onClick={() => setShowSessions((v) => !v)}
              className="mb-2 flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Sessions ({sessions.length})
              </span>
              {showSessions ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
            {showSessions && <TimerSessionsPanel />}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
            <button
              type="button"
              onClick={handleNotifyToggle}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {notificationsOn && canNotify() ? (
                <Bell className="size-3.5" />
              ) : (
                <BellOff className="size-3.5" />
              )}
              {notificationsOn ? "Notifications" : "Notify off"}
            </button>
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              {soundOn ? "Sound on" : "Sound off"}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Settings
              {showSettings ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </button>
          </div>

          {showSettings && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {(
                [
                  ["focusMin", "Focus (min)"],
                  ["shortBreakMin", "Short break"],
                  ["longBreakMin", "Long break"],
                  ["roundsBeforeLong", "Rounds → long"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{label}</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={settings[key]}
                    onChange={(e) =>
                      updateSettings({ [key]: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="rounded border bg-background px-2 py-1"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
