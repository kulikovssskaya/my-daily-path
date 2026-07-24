"use client";

import * as React from "react";
import { Brain, Plus, Trash2 } from "lucide-react";
import { useMemoryStore } from "@/stores/memoryStore";
import type { Pace } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PACE_OPTIONS: { value: Pace; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

function StringListSection({
  title,
  hint,
  items,
  onAdd,
  onUpdate,
  onRemove,
  placeholder,
}: {
  title: string;
  hint?: string;
  items: string[];
  onAdd: (text: string) => void;
  onUpdate: (index: number, text: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = React.useState("");

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-xs font-medium">{title}</h3>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-1">
            <input
              className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
              value={item}
              onChange={(e) => onUpdate(index, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(index)}
              title="Remove"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const t = draft.trim();
            if (!t) return;
            onAdd(t);
            setDraft("");
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          disabled={!draft.trim()}
          onClick={() => {
            onAdd(draft);
            setDraft("");
          }}
        >
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function LearningPaceSection() {
  const learningPace = useMemoryStore((s) => s.learningPace);
  const setPace = useMemoryStore((s) => s.setPace);
  const removePace = useMemoryStore((s) => s.removePace);
  const [topic, setTopic] = React.useState("");
  const [pace, setPaceLocal] = React.useState<Pace>("normal");

  const entries = Object.entries(learningPace).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-xs font-medium">Learning pace</h3>
        <p className="text-[11px] text-muted-foreground">
          Topics the AI planner should pace differently (e.g. math, English).
        </p>
      </div>
      {entries.length > 0 && (
        <ul className="space-y-1">
          {entries.map(([key, value]) => (
            <li
              key={key}
              className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs"
            >
              <span>
                <span className="font-medium">{key}</span>
                <span className="text-muted-foreground"> — {value}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => removePace(key)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-1">
        <input
          className="min-w-[8rem] flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
          placeholder="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <select
          className="rounded-md border bg-background px-2 py-1.5 text-xs"
          value={pace}
          onChange={(e) => setPaceLocal(e.target.value as Pace)}
        >
          {PACE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={!topic.trim()}
          onClick={() => {
            setPace(topic, pace);
            setTopic("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function NotesSection() {
  const notes = useMemoryStore((s) => s.notes);
  const addNote = useMemoryStore((s) => s.addNote);
  const removeNote = useMemoryStore((s) => s.removeNote);
  const [draft, setDraft] = React.useState("");

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-xs font-medium">AI memory notes</h3>
        <p className="text-[11px] text-muted-foreground">
          Facts for every AI prompt. The planner can add notes automatically.
        </p>
      </div>
      {notes.length > 0 && (
        <ul className="space-y-1">
          {notes.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
              )}
            >
              <span className="min-w-0 flex-1">{n.text}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeNote(n.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1">
        <input
          className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
          placeholder="e.g. Prefer morning deep work, no meetings after 6pm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            addNote(draft);
            setDraft("");
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          disabled={!draft.trim()}
          onClick={() => {
            addNote(draft);
            setDraft("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

export function MemorySettingsCard() {
  const goals = useMemoryStore((s) => s.goals);
  const values = useMemoryStore((s) => s.values);
  const constraints = useMemoryStore((s) => s.constraints);
  const preferences = useMemoryStore((s) => s.preferences);
  const addGoal = useMemoryStore((s) => s.addGoal);
  const updateGoal = useMemoryStore((s) => s.updateGoal);
  const removeGoal = useMemoryStore((s) => s.removeGoal);
  const addValue = useMemoryStore((s) => s.addValue);
  const updateValue = useMemoryStore((s) => s.updateValue);
  const removeValue = useMemoryStore((s) => s.removeValue);
  const addConstraint = useMemoryStore((s) => s.addConstraint);
  const updateConstraint = useMemoryStore((s) => s.updateConstraint);
  const removeConstraint = useMemoryStore((s) => s.removeConstraint);
  const addPreference = useMemoryStore((s) => s.addPreference);
  const updatePreference = useMemoryStore((s) => s.updatePreference);
  const removePreference = useMemoryStore((s) => s.removePreference);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Brain className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm">Goals & AI memory</CardTitle>
          <p className="text-xs text-muted-foreground">
            Edited here and sent to Schedule, Progress, Career, and Cooking AI.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <StringListSection
          title="Long-term goals"
          hint="What you are working toward over months."
          items={goals}
          onAdd={addGoal}
          onUpdate={updateGoal}
          onRemove={removeGoal}
          placeholder="e.g. Land ML engineer role by October"
        />
        <StringListSection
          title="Values"
          items={values}
          onAdd={addValue}
          onUpdate={updateValue}
          onRemove={removeValue}
          placeholder="e.g. Health before hustle"
        />
        <StringListSection
          title="Constraints"
          hint="Hard limits the planner must respect."
          items={constraints}
          onAdd={addConstraint}
          onUpdate={updateConstraint}
          onRemove={removeConstraint}
          placeholder="e.g. Max 6h learning on weekdays"
        />
        <StringListSection
          title="Preferences"
          items={preferences}
          onAdd={addPreference}
          onUpdate={updatePreference}
          onRemove={removePreference}
          placeholder="e.g. Batch cooking on Sundays"
        />
        <LearningPaceSection />
        <NotesSection />
      </CardContent>
    </Card>
  );
}
