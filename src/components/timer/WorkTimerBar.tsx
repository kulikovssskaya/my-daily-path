"use client";

import * as React from "react";
import { Play, Square, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useTimerStore, formatTimerElapsed } from "@/stores/timerStore";
import { useProgressStore } from "@/stores/progressStore";
import type { EventCategory } from "@/types";

export function WorkTimerBar({ className }: { className?: string }) {
  const active = useTimerStore((s) => s.active);
  const draft = useTimerStore((s) => s.draft);
  const setDraft = useTimerStore((s) => s.setDraft);
  const start = useTimerStore((s) => s.start);
  const stop = useTimerStore((s) => s.stop);
  const discard = useTimerStore((s) => s.discard);
  const tracks = useProgressStore((s) => s.tracks);

  const [expanded, setExpanded] = React.useState(false);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [lastMessage, setLastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return;
    }
    const tick = () => setElapsedMs(Date.now() - active.startedAt);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  React.useEffect(() => {
    if (!lastMessage) return;
    const id = window.setTimeout(() => setLastMessage(null), 4000);
    return () => window.clearTimeout(id);
  }, [lastMessage]);

  const handleStop = () => {
    const session = stop();
    if (!session) return;
    if (session.savedToCalendar) {
      setLastMessage(`Saved ${formatTimerElapsed((session.endedAt ?? 0) - session.startedAt)} to calendar`);
    } else if ((session.endedAt ?? 0) - session.startedAt < 60_000) {
      setLastMessage("Session under 1 min — not saved");
    } else {
      setLastMessage("Stopped (not saved to calendar)");
    }
    setExpanded(false);
  };

  if (active) {
    return (
      <div
        className={cn(
          "sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary/5 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4",
          className
        )}
      >
        <Timer className="size-4 shrink-0 animate-pulse text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{active.title}</span>
        <span className="font-mono text-lg tabular-nums tracking-tight">
          {formatTimerElapsed(elapsedMs)}
        </span>
        <Button size="sm" variant="destructive" onClick={handleStop}>
          <Square className="size-3.5 fill-current" />
          Stop
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b bg-muted/20 px-3 py-2 backdrop-blur sm:px-4",
        className
      )}
    >
      {!expanded ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
            <Play className="size-3.5" />
            Start timer
          </Button>
          {lastMessage ? (
            <span className="text-xs text-muted-foreground">{lastMessage}</span>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Work timer</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setExpanded(false)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px] flex-1 space-y-1">
              <label className="text-[10px] text-muted-foreground">Title</label>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ title: e.target.value })}
                placeholder="What are you working on?"
                className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Category</label>
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({ category: e.target.value as EventCategory })
                }
                className="rounded-lg border bg-background px-2.5 py-1.5 text-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {draft.category === "learning" && tracks.length > 0 ? (
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Track</label>
                <select
                  value={draft.trackId}
                  onChange={(e) => setDraft({ trackId: e.target.value })}
                  className="rounded-lg border bg-background px-2.5 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <label className="flex items-center gap-1.5 pb-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.saveToCalendar}
                onChange={(e) => setDraft({ saveToCalendar: e.target.checked })}
                className="rounded"
              />
              Save to calendar
            </label>
            <Button size="sm" onClick={() => start()}>
              <Play className="size-3.5" />
              Start
            </Button>
            <Button size="sm" variant="ghost" onClick={() => discard()}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
