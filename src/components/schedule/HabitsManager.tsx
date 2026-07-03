"use client";

import * as React from "react";
import { Plus, Trash2, Repeat, Sparkles, Loader2, Brain, Pencil, Check, X } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import type { EventCategory, Habit } from "@/types";
import type { AIHabit } from "@/lib/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import { postAI } from "@/lib/aiClient";
import { cn } from "@/lib/utils";

function AIHabitsFromText() {
  const habits = useScheduleStore((s) => s.habits);
  const addHabits = useScheduleStore((s) => s.addHabits);
  const setHabits = useScheduleStore((s) => s.setHabits);
  const [text, setText] = React.useState("");
  const [replaceAll, setReplaceAll] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [reasoning, setReasoning] = React.useState<string | null>(null);

  const generate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setNote(null);
    setReasoning(null);
    try {
      const res = await postAI<{
        data: { habits: AIHabit[]; mode: "merge" | "replace"; reasoning?: string };
      }>("/api/ai/habits", {
        instruction: text,
        existingHabits: habits.map((h) => ({
          title: h.title,
          weekdays: h.weekdays,
          time: h.time,
          duration: h.duration,
        })),
      });
      const wantReplace = replaceAll || res.data.mode === "replace";
      const count = wantReplace ? setHabits(res.data.habits) : addHabits(res.data.habits);
      setReasoning(res.data.reasoning ?? null);
      if (count === 0) {
        setNote("No recurring habits detected. Add an AI key or add more detail.");
      } else {
        setNote(`${wantReplace ? "Replaced with" : "Added"} ${count} habit(s).`);
        setText("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build habits.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" />
        AI: build recurring habits from a weekly routine (any language)
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder={"Paste a weekly routine, e.g.\nMonday 09:45–10:01 Neck workout, Eye exercises\n11:00–13:00 Study\n..."}
        className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={replaceAll}
            onChange={(e) => setReplaceAll(e.target.checked)}
          />
          Replace all existing habits
        </label>
        <Button onClick={generate} disabled={loading || !text.trim()} className="ml-auto">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate habits
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {reasoning && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Brain className="mt-0.5 size-3.5 shrink-0 text-primary" />
          {reasoning}
        </p>
      )}
    </div>
  );
}

const WEEKDAYS = [
  { i: 1, l: "Mon" },
  { i: 2, l: "Tue" },
  { i: 3, l: "Wed" },
  { i: 4, l: "Thu" },
  { i: 5, l: "Fri" },
  { i: 6, l: "Sat" },
  { i: 0, l: "Sun" },
];

function HabitEditor({
  habit,
  onSave,
  onCancel,
}: {
  habit: Habit;
  onSave: (patch: Partial<Habit>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(habit.title);
  const [weekdays, setWeekdays] = React.useState<number[]>(habit.weekdays);
  const [time, setTime] = React.useState(habit.time);
  const [duration, setDuration] = React.useState(habit.duration);
  const [category, setCategory] = React.useState<EventCategory>(habit.category);

  const toggleDay = (i: number) =>
    setWeekdays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((w) => (
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
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            step={1}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
            className="w-20 rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">min</span>
        </div>
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
        <Button
          size="sm"
          onClick={() =>
            onSave({ title: title.trim(), weekdays, time, duration, category })
          }
          disabled={!title.trim() || weekdays.length === 0}
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

function HabitRow({ habit }: { habit: Habit }) {
  const updateHabit = useScheduleStore((s) => s.updateHabit);
  const removeHabit = useScheduleStore((s) => s.removeHabit);
  const [editing, setEditing] = React.useState(false);
  const meta = CATEGORY_OPTIONS.find((o) => o.value === habit.category);

  if (editing) {
    return (
      <li>
        <HabitEditor
          habit={habit}
          onSave={(patch) => {
            updateHabit(habit.id, patch);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <div className="min-w-0">
        <span className="font-medium">{habit.title}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {habit.weekdays
            .map((d) => WEEKDAYS.find((w) => w.i === d)?.l)
            .filter(Boolean)
            .join(", ")}{" "}
          · {habit.time} · {habit.duration} min
          {meta ? ` · ${meta.label}` : ""}
        </span>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setEditing(true)}
          aria-label="Edit habit"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={() => removeHabit(habit.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

export function HabitsManager() {
  const { addHabit } = useScheduleStore();
  const habits = useScheduleStore((s) => s.habits);
  const [title, setTitle] = React.useState("");
  const [weekdays, setWeekdays] = React.useState<number[]>([]);
  const [time, setTime] = React.useState("18:00");
  const [duration, setDuration] = React.useState(60);
  const [category, setCategory] = React.useState<EventCategory>("health");

  const toggleDay = (i: number) =>
    setWeekdays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  const submit = () => {
    if (!title.trim() || weekdays.length === 0) return;
    addHabit({ title: title.trim(), weekdays, time, duration, category });
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
          <CardTitle className="text-sm">Recurring habits</CardTitle>
          <p className="text-xs text-muted-foreground">
            Shown in agenda & calendar — click the pencil to edit
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AIHabitsFromText />

        {habits.length > 0 && (
          <ul className="space-y-2">
            {habits.map((h) => (
              <HabitRow key={h.id} habit={h} />
            ))}
          </ul>
        )}

        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <p className="text-xs font-medium text-muted-foreground">Add manually</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Massage"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((w) => (
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
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                step={1}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                className="w-20 rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
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
            <Button
              onClick={submit}
              disabled={!title.trim() || weekdays.length === 0}
              className="ml-auto"
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
