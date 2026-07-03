"use client";

import { Lock } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";

export function DataProtectionBanner() {
  const lockedEvents = useScheduleStore(
    (s) => s.events.filter((e) => e.locked).length
  );
  const lockedHabits = useScheduleStore(
    (s) => s.habits.filter((h) => h.locked).length
  );
  const lockedLogs = useProgressStore((s) => s.logs.filter((l) => l.locked).length);
  const total = lockedEvents + lockedHabits + lockedLogs;

  if (total === 0) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
      <Lock className="mt-0.5 size-3.5 shrink-0" />
      <p>
        <span className="font-medium">{total} item(s) permanently saved</span> — unchanged for 2+
        days. AI and planner cannot overwrite them. Click the unlock icon on a row to edit.
      </p>
    </div>
  );
}
