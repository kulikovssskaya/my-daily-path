"use client";

import * as React from "react";
import { ChevronRight, Play, Square, Timer, X } from "lucide-react";
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

  const [open, setOpen] = React.useState(false);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [lastMessage, setLastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

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
      setLastMessage(
        `Saved ${formatTimerElapsed((session.endedAt ?? 0) - session.startedAt)} to calendar`
      );
    } else if ((session.endedAt ?? 0) - session.startedAt < 60_000) {
      setLastMessage("Under 1 min — not saved");
    } else {
      setLastMessage("Stopped (not saved)");
    }
  };

  const runningPanel = (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Running
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setOpen(false)}
          aria-label="Collapse timer"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="space-y-1 text-center">
        <p className="line-clamp-2 text-sm font-medium">{active?.title}</p>
        <p className="font-mono text-3xl tabular-nums tracking-tight">
          {formatTimerElapsed(elapsedMs)}
        </p>
      </div>
      <Button variant="destructive" className="w-full" onClick={handleStop}>
        <Square className="size-3.5 fill-current" />
        Stop
      </Button>
    </div>
  );

  const setupPanel = (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 scrollbar-thin">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Work timer
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setOpen(false)}
          aria-label="Collapse timer"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="space-y-1">
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
          onChange={(e) => setDraft({ category: e.target.value as EventCategory })}
          className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm"
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
            className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm"
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

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={draft.saveToCalendar}
          onChange={(e) => setDraft({ saveToCalendar: e.target.checked })}
          className="rounded"
        />
        Save to calendar
      </label>

      <div className="flex gap-2 pt-1">
        <Button className="flex-1" size="sm" onClick={() => start()}>
          <Play className="size-3.5" />
          Start
        </Button>
        <Button size="sm" variant="ghost" onClick={() => discard()}>
          Cancel
        </Button>
      </div>

      {lastMessage ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{lastMessage}</p>
      ) : null}
    </div>
  );

  const collapsedRail = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-full w-full flex-col items-center justify-center gap-2 py-4 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Open timer"
      title="Timer"
    >
      <Timer className={cn("size-5", active && "animate-pulse text-primary")} />
      {active ? (
        <span className="origin-center rotate-180 font-mono text-[10px] tabular-nums [writing-mode:vertical-rl]">
          {formatTimerElapsed(elapsedMs)}
        </span>
      ) : null}
    </button>
  );

  return (
    <>
      {/* Desktop: right rail inside layout */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-l bg-card/95 backdrop-blur transition-[width] duration-200 md:flex",
          open ? "w-72" : "w-11",
          active && open && "border-primary/20 bg-primary/5",
          className
        )}
      >
        {open ? (active ? runningPanel : setupPanel) : collapsedRail}
      </aside>

      {/* Mobile: slide-over from the right */}
      <div className="md:hidden">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 bg-card px-2 py-3 shadow-lg",
              active && "border-primary/30 bg-primary/5"
            )}
            aria-label="Open timer"
          >
            <Timer className={cn("size-5", active && "animate-pulse text-primary")} />
            {active ? (
              <span className="font-mono text-[10px] tabular-nums">
                {formatTimerElapsed(elapsedMs)}
              </span>
            ) : null}
          </button>
        ) : (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => !active && setOpen(false)}
              aria-hidden
            />
            <aside
              className={cn(
                "fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l bg-card shadow-xl",
                active && "border-primary/20 bg-primary/5"
              )}
            >
              <div className="flex items-center justify-end border-b p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setOpen(false)}
                  aria-label="Close timer"
                >
                  <X className="size-4" />
                </Button>
              </div>
              {active ? runningPanel : setupPanel}
            </aside>
          </>
        )}
      </div>
    </>
  );
}
