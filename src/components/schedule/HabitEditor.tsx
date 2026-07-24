"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import type { EventCategory, Habit } from "@/types";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { cn } from "@/lib/utils";

export const HABIT_WEEKDAYS = [
  { i: 1, l: "Mon" },
  { i: 2, l: "Tue" },
  { i: 3, l: "Wed" },
  { i: 4, l: "Thu" },
  { i: 5, l: "Fri" },
  { i: 6, l: "Sat" },
  { i: 0, l: "Sun" },
] as const;

export function HabitEditor({
  habit,
  onSave,
  onCancel,
  disabled,
}: {
  habit: Habit;
  onSave: (patch: Partial<Habit>) => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const [title, setTitle] = React.useState(habit.title);
  const [weekdays, setWeekdays] = React.useState<number[]>(habit.weekdays);
  const [time, setTime] = React.useState(habit.time);
  const [duration, setDuration] = React.useState(habit.duration);
  const [category, setCategory] = React.useState<EventCategory>(habit.category);

  React.useEffect(() => {
    setTitle(habit.title);
    setWeekdays(habit.weekdays);
    setTime(habit.time);
    setDuration(habit.duration);
    setCategory(habit.category);
  }, [habit]);

  const toggleDay = (i: number) =>
    setWeekdays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <input
        value={title}
        disabled={disabled}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />
      <div className="flex flex-wrap gap-1.5">
        {HABIT_WEEKDAYS.map((w) => (
          <button
            key={w.i}
            type="button"
            disabled={disabled}
            onClick={() => toggleDay(w.i)}
            className={cn(
              "h-9 min-w-11 rounded-lg border px-2 text-xs font-medium transition-colors disabled:opacity-60",
              weekdays.includes(w.i)
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {w.l}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          disabled={disabled}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            step={1}
            disabled={disabled}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
            className="w-20 rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
          />
          <span className="text-xs text-muted-foreground">min</span>
        </div>
        <select
          disabled={disabled}
          value={category}
          onChange={(e) => setCategory(e.target.value as EventCategory)}
          className="rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={disabled || !title.trim() || weekdays.length === 0}
          onClick={() => onSave({ title: title.trim(), weekdays, time, duration, category })}
          className="ml-auto"
        >
          <Check className="size-4" />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
