"use client";

import * as React from "react";
import { Pencil, Save, Trash2, Clock } from "lucide-react";
import { useTimerStore } from "@/stores/timerStore";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import type { TimerSession } from "@/types";
import {
  MIN_TIMER_SESSION_MS,
  parseDatetimeLocalValue,
  sessionDurationMin,
  toDatetimeLocalValue,
} from "@/lib/timerSessions";
import { playChime } from "@/lib/sounds";
import { Button } from "@/components/ui/button";
import { cn, toNaiveISO } from "@/lib/utils";

function persistSession(
  session: TimerSession,
  endedAt: number,
  soundOn: boolean
) {
  if (endedAt - session.startedAt < MIN_TIMER_SESSION_MS) return false;

  const { addEvent, updateEvent } = useScheduleStore.getState();
  const { addLog, updateLog } = useProgressStore.getState();
  const { markSessionSaved, updateSession } = useTimerStore.getState();

  const title =
    session.title.trim() ||
    (session.kind === "pomodoro" ? "Pomodoro session" : "Work session");
  const mins = sessionDurationMin({ ...session, endedAt });
  const logText = `${title} (${mins} min${mins === 1 ? "" : "s"})`;

  if (session.savedToCalendar && session.calendarEventId) {
    updateEvent(session.calendarEventId, {
      title,
      category: session.category,
      start: toNaiveISO(new Date(session.startedAt)),
      end: toNaiveISO(new Date(endedAt)),
      status: "done",
      meta: session.track ? { track: session.track } : undefined,
    });
    if (session.logId) updateLog(session.logId, logText);
    updateSession(session.id, { endedAt, title, savedToCalendar: true });
    if (soundOn) playChime("session_saved");
    return true;
  }

  const calendarEventId = addEvent({
    title,
    category: session.category,
    start: toNaiveISO(new Date(session.startedAt)),
    end: toNaiveISO(new Date(endedAt)),
    status: "done",
    priority: 3,
    meta: session.track ? { track: session.track } : undefined,
  });
  const logId = addLog(logText, calendarEventId, session.id);
  updateSession(session.id, { endedAt, title });
  markSessionSaved(session.id, calendarEventId, logId);
  if (soundOn) playChime("session_saved");
  return true;
}

function SessionRow({ session, isActive }: { session: TimerSession; isActive: boolean }) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(session.title);
  const [startVal, setStartVal] = React.useState(toDatetimeLocalValue(session.startedAt));
  const [endVal, setEndVal] = React.useState(
    session.endedAt ? toDatetimeLocalValue(session.endedAt) : toDatetimeLocalValue(Date.now())
  );

  const updateSession = useTimerStore((s) => s.updateSession);
  const removeSession = useTimerStore((s) => s.removeSession);
  const stopActiveSessionNow = useTimerStore((s) => s.stopActiveSessionNow);
  const soundOn = useTimerStore((s) => s.soundOn);

  React.useEffect(() => {
    setTitle(session.title);
    setStartVal(toDatetimeLocalValue(session.startedAt));
    setEndVal(
      session.endedAt ? toDatetimeLocalValue(session.endedAt) : toDatetimeLocalValue(Date.now())
    );
  }, [session]);

  const running = isActive && session.endedAt === null;
  const endedAt = session.endedAt ?? Date.now();
  const mins = sessionDurationMin(session);

  const handleSaveFields = () => {
    const startedAt = parseDatetimeLocalValue(startVal);
    const ended = parseDatetimeLocalValue(endVal);
    updateSession(session.id, { title, startedAt, endedAt: ended });
    setEditing(false);
  };

  const handleStopNow = () => {
    stopActiveSessionNow();
  };

  const handleSaveToCalendar = () => {
    const startedAt = parseDatetimeLocalValue(startVal);
    const ended = session.endedAt ?? parseDatetimeLocalValue(endVal);
    const next = { ...session, title, startedAt, endedAt: ended };
    if (persistSession(next, ended, soundOn)) {
      setEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 text-xs",
        running && "border-primary/40 bg-primary/5",
        session.savedToCalendar && "opacity-80"
      )}
    >
      {editing ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border bg-background px-2 py-1"
            placeholder="Activity"
          />
          <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
            Start
            <input
              type="datetime-local"
              value={startVal}
              onChange={(e) => setStartVal(e.target.value)}
              className="rounded border bg-background px-2 py-1 text-xs"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
            End
            <input
              type="datetime-local"
              value={endVal}
              onChange={(e) => setEndVal(e.target.value)}
              className="rounded border bg-background px-2 py-1 text-xs"
            />
          </label>
          <div className="flex gap-1">
            <Button size="sm" className="h-7 flex-1 text-[11px]" onClick={handleSaveFields}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium">
                {session.title.trim() || "Untitled session"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {running ? (
                  <span className="text-primary">Running · {mins} min so far</span>
                ) : (
                  `${mins} min · ${session.kind}`
                )}
                {session.savedToCalendar && " · saved"}
              </div>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-accent"
                onClick={() => setEditing(true)}
                title="Edit"
              >
                <Pencil className="size-3" />
              </button>
              {!session.savedToCalendar && (
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  onClick={() => removeSession(session.id)}
                  title="Delete"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {running && (
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleStopNow}>
                Stop now
              </Button>
            )}
            {!session.savedToCalendar && !running && endedAt - session.startedAt >= MIN_TIMER_SESSION_MS && (
              <Button size="sm" className="h-7 text-[11px]" onClick={handleSaveToCalendar}>
                <Save className="size-3" />
                Save to calendar
              </Button>
            )}
            {session.savedToCalendar && (
              <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={handleSaveToCalendar}>
                Update calendar
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function TimerSessionsPanel() {
  const sessions = useTimerStore((s) => s.sessions);
  const activeSessionId = useTimerStore((s) => s.activeSessionId);

  if (sessions.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        Sessions appear here when you start the timer. Edit times if you forgot to stop.
      </p>
    );
  }

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-thin">
      {sessions.slice(0, 12).map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
        />
      ))}
    </div>
  );
}

export { persistSession };
