import type { EventCategory } from "@/types";

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; dot: string; hex: string; badge: string; row: string }
> = {
  learning: {
    label: "Learning",
    dot: "bg-violet-500",
    hex: "#8b5cf6",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    row: "border-violet-500/25 bg-violet-500/5",
  },
  work: {
    label: "Work",
    dot: "bg-blue-500",
    hex: "#3b82f6",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    row: "border-blue-500/25 bg-blue-500/5",
  },
  health: {
    label: "Health",
    dot: "bg-emerald-500",
    hex: "#10b981",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    row: "border-emerald-500/25 bg-emerald-500/5",
  },
  meal: {
    label: "Meal",
    dot: "bg-amber-500",
    hex: "#f59e0b",
    badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    row: "border-amber-500/40 border-dashed bg-amber-500/8",
  },
  rest: {
    label: "Rest",
    dot: "bg-sky-400",
    hex: "#38bdf8",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    row: "border-sky-500/25 bg-sky-500/5",
  },
  commute: {
    label: "Commute",
    dot: "bg-slate-400",
    hex: "#94a3b8",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    row: "",
  },
  habit: {
    label: "Habit",
    dot: "bg-pink-500",
    hex: "#ec4899",
    badge: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    row: "border-pink-500/30 border-dashed bg-pink-500/5",
  },
  other: {
    label: "Other",
    dot: "bg-zinc-400",
    hex: "#a1a1aa",
    badge: "bg-muted text-muted-foreground",
    row: "",
  },
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(
  ([value, meta]) => ({ value: value as EventCategory, label: meta.label })
);
