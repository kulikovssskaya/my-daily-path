"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { normalizeHabitTime } from "@/lib/habits";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, "0");

function parseTime(value: string) {
  const normalized = normalizeHabitTime(value);
  const [hh, mm] = normalized.split(":").map((n) => parseInt(n, 10));
  return { hh: hh || 0, mm: mm || 0 };
}

export function TimeField({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { hh, mm } = parseTime(value);
  const minute = MINUTES.includes(mm) ? mm : MINUTES.reduce((a, b) => (Math.abs(b - mm) < Math.abs(a - mm) ? b : a));

  const emit = (h: number, m: number) =>
    onChange(normalizeHabitTime(`${pad(h)}:${pad(m)}`));

  const nudge = (delta: number) => {
    let total = hh * 60 + mm + delta;
    total = ((total % 1440) + 1440) % 1440;
    emit(Math.floor(total / 60), total % 60);
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <select
        value={hh}
        disabled={disabled}
        onChange={(e) => emit(parseInt(e.target.value, 10), mm)}
        className="h-9 min-w-[4.25rem] rounded-lg border bg-background px-2 text-sm tabular-nums"
        aria-label="Hour"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted-foreground">:</span>
      <select
        value={minute}
        disabled={disabled}
        onChange={(e) => emit(hh, parseInt(e.target.value, 10))}
        className="h-9 min-w-[4.25rem] rounded-lg border bg-background px-2 text-sm tabular-nums"
        aria-label="Minute"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={() => nudge(-15)}
        className="inline-flex size-9 items-center justify-center rounded-lg border hover:bg-accent disabled:opacity-50"
        title="15 min earlier"
        aria-label="15 minutes earlier"
      >
        <ChevronDown className="size-4" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => nudge(15)}
        className="inline-flex size-9 items-center justify-center rounded-lg border hover:bg-accent disabled:opacity-50"
        title="15 min later"
        aria-label="15 minutes later"
      >
        <ChevronUp className="size-4" />
      </button>
    </div>
  );
}

const DURATION_PRESETS = [30, 45, 60, 90, 120] as const;

export function DurationField({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {DURATION_PRESETS.map((m) => (
        <button
          key={m}
          type="button"
          disabled={disabled}
          onClick={() => onChange(m)}
          className={cn(
            "h-9 rounded-lg border px-2.5 text-xs font-medium tabular-nums transition-colors",
            value === m
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-accent"
          )}
        >
          {m}
        </button>
      ))}
      <input
        type="number"
        min={1}
        step={5}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 30))}
        className="h-9 w-16 rounded-lg border bg-background px-2 text-sm tabular-nums disabled:opacity-50"
        aria-label="Duration in minutes"
      />
      <span className="text-xs text-muted-foreground">min</span>
    </div>
  );
}
