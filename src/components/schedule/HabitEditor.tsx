"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import type { EventCategory, Habit } from "@/types";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { normalizeHabitTime, HABIT_WEEKDAYS } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { TimeField, DurationField } from "@/components/schedule/ScheduleFields";

function initialFromHabit(habit: Habit) {
  return {
    title: habit.title,
    weekdays: [...habit.weekdays],
    time: normalizeHabitTime(habit.time),
    duration: habit.duration,
    category: habit.category,
  };
}

export function HabitEditor({
  habit,
  onSave,
  onCancel,
  learningOnly = false,
}: {
  habit: Habit;
  onSave: (patch: Partial<Habit>) => void;
  onCancel: () => void;
  learningOnly?: boolean;
}) {
  const initial = React.useMemo(() => initialFromHabit(habit), [habit.id]);
  const [title, setTitle] = React.useState(initial.title);
  const [weekdays, setWeekdays] = React.useState<number[]>(initial.weekdays);
  const [time, setTime] = React.useState(initial.time);
  const [duration, setDuration] = React.useState(initial.duration);
  const [category, setCategory] = React.useState<EventCategory>(initial.category);

  const toggleDay = (i: number) =>
    setWeekdays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  const save = () => {
    onSave({
      title: title.trim(),
      weekdays: [...weekdays].sort((a, b) => a - b),
      time: normalizeHabitTime(time),
      duration: Math.max(1, duration || 30),
      category: learningOnly ? "learning" : category,
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap gap-1.5">
        {HABIT_WEEKDAYS.map((w) => (
          <button
            key={w.i}
            type="button"
            onClick={() => toggleDay(w.i)}
            className={cn(
              "h-9 min-w-11 rounded-lg border px-2 text-xs font-medium transition-colors",
              weekdays.includes(w.i)
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {w.l}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Time & duration</p>
        <TimeField value={time} onChange={setTime} />
        <DurationField value={duration} onChange={setDuration} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!learningOnly && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <Button
          size="sm"
          disabled={!title.trim() || weekdays.length === 0}
          onClick={save}
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
