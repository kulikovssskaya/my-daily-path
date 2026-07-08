"use client";

import * as React from "react";
import {
  Check,
  X,
  Trash2,
  Pencil,
  Plus,
  CircleDashed,
  Circle,
  Repeat,
  Lock,
  LockOpen,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import type { ScheduleEvent, EventStatus, EventCategory } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/categories";
import { habitOccurrencesForDate, type HabitOccurrence } from "@/lib/habits";
import { eventEchoesHabitOnDay } from "@/lib/habitDedupe";

const STATUS_ICON: Record<EventStatus, React.ReactNode> = {
  planned: <CircleDashed className="size-4 text-muted-foreground" />,
  done: <Check className="size-4 text-emerald-500" />,
  skipped: <X className="size-4 text-destructive" />,
};

const MEAL_TITLE =
  /breakfast|lunch|dinner|brunch|meal|snack|обед|завтрак|ужин|перекус|еда|поесть/i;

function timeOf(iso: string) {
  return iso.slice(11, 16);
}
function withTime(iso: string, hhmm: string) {
  return `${iso.slice(0, 10)}T${hhmm}:00`;
}
const PAST_DAYS = 90;
const FUTURE_DAYS = 14;

function dayKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: Date, offset: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + offset);
  return d;
}

function dayTitle(date: Date, today: Date): string {
  const key = dayKey(date);
  if (key === dayKey(today)) return "Today";
  if (key === dayKey(addDays(today, -1))) return "Yesterday";
  if (key === dayKey(addDays(today, -2))) return "2 days ago";
  if (key === dayKey(addDays(today, 1))) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function DayPicker({
  selected,
  min,
  max,
  today,
  onChange,
}: {
  selected: Date;
  min: Date;
  max: Date;
  today: Date;
  onChange: (d: Date) => void;
}) {
  const minKey = dayKey(min);
  const maxKey = dayKey(max);
  const selectedKey = dayKey(selected);
  const todayKey = dayKey(today);
  const canPrev = selectedKey > minKey;
  const canNext = selectedKey < maxKey;
  const title = dayTitle(selected, today);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {selectedKey !== todayKey && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => onChange(new Date(today))}
        >
          Today
        </Button>
      )}
      <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        disabled={!canPrev}
        onClick={() => onChange(addDays(selected, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <label className="relative flex min-w-[10.5rem] cursor-pointer items-center justify-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent/50">
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{title}</span>
        <span className="truncate text-xs font-normal text-muted-foreground">
          {selected.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
        </span>
        <input
          type="date"
          value={selectedKey}
          min={minKey}
          max={maxKey}
          onChange={(e) => {
            if (!e.target.value) return;
            const [y, m, d] = e.target.value.split("-").map(Number);
            onChange(new Date(y, m - 1, d));
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pick a day"
        />
      </label>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        disabled={!canNext}
        onClick={() => onChange(addDays(selected, 1))}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </Button>
      </div>
    </div>
  );
}

/** Detect meal from title when AI forgot to set category. */
function effectiveCategory(ev: ScheduleEvent): EventCategory {
  if (ev.category !== "other") return ev.category;
  if (MEAL_TITLE.test(ev.title)) return "meal";
  return ev.category;
}

function CategoryBadge({ category }: { category: EventCategory }) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
  if (category === "other") return null;
  return (
    <span
      className={cn(
        "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline",
        meta.badge
      )}
    >
      {meta.label.toLowerCase()}
    </span>
  );
}

function HabitRow({ occ }: { occ: HabitOccurrence }) {
  const meta = CATEGORY_META[occ.category] ?? CATEGORY_META.habit;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5",
        meta.row || "border-pink-500/30 bg-pink-500/5"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center text-pink-500">
        <Repeat className="size-4" />
      </span>
      <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} />
      <div className="flex min-w-0 flex-1 items-baseline gap-2 sm:gap-3">
        <span className="w-24 shrink-0 tabular-nums text-xs text-muted-foreground">
          {timeOf(occ.start)}–{timeOf(occ.end)}
        </span>
        <span className="truncate text-sm font-medium">{occ.title}</span>
        <span className="hidden shrink-0 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-600 dark:text-pink-400 sm:inline">
          habit
        </span>
        {occ.category !== "other" && occ.category !== "habit" && (
          <CategoryBadge category={occ.category} />
        )}
      </div>
    </div>
  );
}

function EventRow({ ev }: { ev: ScheduleEvent }) {
  const { updateEvent, removeEvent, cycleStatus, unlockEvent } = useScheduleStore();
  const [editing, setEditing] = React.useState(false);
  const cat = effectiveCategory(ev);
  const meta = CATEGORY_META[cat] ?? CATEGORY_META.other;
  const locked = Boolean(ev.locked);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors",
        meta.row,
        ev.status === "done" && "opacity-60",
        ev.status === "skipped" && "opacity-50 line-through",
        locked && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      <button
        onClick={() => cycleStatus(ev.id)}
        title="Change status"
        className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent"
      >
        {STATUS_ICON[ev.status]}
      </button>

      <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} />

      {editing && !locked ? (
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            value={ev.title}
            onChange={(e) => updateEvent(ev.id, { title: e.target.value })}
            className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            type="time"
            value={timeOf(ev.start)}
            onChange={(e) => updateEvent(ev.id, { start: withTime(ev.start, e.target.value) })}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="time"
            value={timeOf(ev.end)}
            onChange={(e) => updateEvent(ev.id, { end: withTime(ev.end, e.target.value) })}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          />
          <select
            value={ev.category}
            onChange={(e) => updateEvent(ev.id, { category: e.target.value as EventCategory })}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            {Object.entries(CATEGORY_META).map(([v, m]) => (
              <option key={v} value={v}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-baseline gap-2 sm:gap-3">
          <span className="w-24 shrink-0 tabular-nums text-xs text-muted-foreground">
            {timeOf(ev.start)}–{timeOf(ev.end)}
          </span>
          <span className="truncate text-sm font-medium">{ev.title}</span>
          {locked && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
              saved
            </span>
          )}
          <CategoryBadge category={cat} />
          {ev.meta?.track && (
            <span className="hidden shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-700 dark:text-violet-400 sm:inline">
              {ev.meta.track}
            </span>
          )}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        {locked ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-amber-700 dark:text-amber-400"
            onClick={() => unlockEvent(ev.id)}
            title="Unlock to edit (protected after 2 days unchanged)"
            aria-label="Unlock"
          >
            <LockOpen className="size-4" />
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setEditing((v) => !v)}
              aria-label="Edit"
            >
              {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeEvent(ev.id)}
              aria-label="Delete"
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
        {locked && <Lock className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />}
      </div>
    </div>
  );
}

function DayColumn({ title, date }: { title: string; date: Date }) {
  const events = useScheduleStore((s) => s.events);
  const habits = useScheduleStore((s) => s.habits);
  const addEvent = useScheduleStore((s) => s.addEvent);
  const key = dayKey(date);

  const occurrences = React.useMemo(
    () => habitOccurrencesForDate(habits, date),
    [habits, date]
  );

  // Hide schedule events that duplicate a recurring habit — show the habit row instead.
  const dayEvents = React.useMemo(
    () =>
      events
        .filter((e) => e.start.slice(0, 10) === key)
        .filter((e) => !eventEchoesHabitOnDay(e, habits))
        .sort((a, b) => a.start.localeCompare(b.start)),
    [events, key, habits]
  );

  const timeline = React.useMemo(() => {
    const items: { key: string; start: string; node: React.ReactNode }[] = [
      ...dayEvents.map((ev) => ({ key: ev.id, start: ev.start, node: <EventRow ev={ev} /> })),
      ...occurrences.map((o) => ({ key: o.id, start: o.start, node: <HabitRow occ={o} /> })),
    ];
    return items.sort((a, b) => a.start.localeCompare(b.start));
  }, [dayEvents, occurrences]);

  const allDayEvents = events.filter((e) => e.start.slice(0, 10) === key);
  const doneCount = allDayEvents.filter((e) => e.status === "done").length;
  const total = allDayEvents.length;

  const quickAdd = () => {
    addEvent({
      title: "New event",
      category: "other",
      start: `${key}T12:00:00`,
      end: `${key}T13:00:00`,
      priority: 2,
    });
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Circle className="size-2 fill-primary text-primary" />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-xs text-muted-foreground">
            {date.toLocaleDateString("en-US", { day: "numeric", month: "long" })}
          </span>
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {doneCount}/{total} done
          </span>
        )}
      </div>

      {timeline.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Empty. Add blocks manually below or open Calendar.
        </p>
      ) : (
        <div className="space-y-2">
          {timeline.map((item) => (
            <React.Fragment key={item.key}>{item.node}</React.Fragment>
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={quickAdd} className="self-start text-muted-foreground">
        <Plus className="size-4" />
        Add manually
      </Button>
    </Card>
  );
}

export function Agenda() {
  const [mounted, setMounted] = React.useState(false);
  const [selected, setSelected] = React.useState<Date>(() => new Date());
  React.useEffect(() => setMounted(true), []);

  const today = new Date();
  const min = addDays(today, -PAST_DAYS);
  const max = addDays(today, FUTURE_DAYS);

  if (!mounted) {
    return (
      <div className="space-y-3">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Pick a day and edit manually</p>
        <DayPicker
          selected={selected}
          min={min}
          max={max}
          today={today}
          onChange={setSelected}
        />
      </div>

      <DayColumn title={dayTitle(selected, today)} date={selected} />
    </div>
  );
}
