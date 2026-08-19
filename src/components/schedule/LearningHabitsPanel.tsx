"use client";

import * as React from "react";
import { Plus, Repeat, Trash2 } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { normalizeHabitTime, HABIT_WEEKDAYS } from "@/lib/habits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TimeField, DurationField } from "@/components/schedule/ScheduleFields";
import type { Habit } from "@/types";

function LearningHabitRow({ habit }: { habit: Habit }) {
  const updateHabit = useScheduleStore((s) => s.updateHabit);
  const removeHabit = useScheduleStore((s) => s.removeHabit);

  const patch = (p: Partial<Habit>) => updateHabit(habit.id, { ...p, category: "learning" });

  const toggleDay = (i: number) => {
    const weekdays = habit.weekdays.includes(i)
      ? habit.weekdays.filter((x) => x !== i)
      : [...habit.weekdays, i];
    patch({ weekdays: weekdays.sort((a, b) => a - b) });
  };

  return (
    <li className="space-y-2 rounded-lg border px-3 py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{habit.title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => removeHabit(habit.id)}
          aria-label="Remove habit"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {HABIT_WEEKDAYS.map((w) => (
          <button
            key={w.i}
            type="button"
            onClick={() => toggleDay(w.i)}
            className={cn(
              "h-8 min-w-10 rounded-md border px-1.5 text-xs font-medium transition-colors",
              habit.weekdays.includes(w.i)
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {w.l}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <TimeField value={habit.time} onChange={(time) => patch({ time: normalizeHabitTime(time) })} />
        <DurationField value={habit.duration} onChange={(duration) => patch({ duration })} />
      </div>
    </li>
  );
}

export function LearningHabitsPanelBody() {
  const allHabits = useScheduleStore((s) => s.habits);
  const habits = React.useMemo(
    () => (allHabits ?? []).filter((h) => h?.category === "learning"),
    [allHabits]
  );
  const addHabit = useScheduleStore((s) => s.addHabit);
  const [title, setTitle] = React.useState("");
  const [weekdays, setWeekdays] = React.useState<number[]>([]);
  const [time, setTime] = React.useState("18:00");
  const [duration, setDuration] = React.useState(60);

  const toggleDay = (i: number) =>
    setWeekdays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  const submit = () => {
    if (!title.trim() || weekdays.length === 0) return;
    addHabit({
      title: title.trim(),
      weekdays,
      time: normalizeHabitTime(time),
      duration,
      category: "learning",
    });
    setTitle("");
    setWeekdays([]);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Repeat className="size-4" />
        </span>
        <div>
          <CardTitle className="text-sm">Recurring learning</CardTitle>
          <p className="text-xs text-muted-foreground">
            Change time with dropdowns or ±15 min — saves immediately
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {habits.length > 0 && (
          <ul className="space-y-2">
            {habits.map((h) => (
              <LearningHabitRow key={h.id} habit={h} />
            ))}
          </ul>
        )}

        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground">Add learning session</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Learning with dad"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <TimeField value={time} onChange={setTime} />
            <DurationField value={duration} onChange={setDuration} />
            <Button
              onClick={submit}
              disabled={!title.trim() || weekdays.length === 0}
              className="sm:ml-auto"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
