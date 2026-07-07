"use client";

import { useMounted } from "@/hooks/useMounted";
import { GoalCard } from "@/components/progress/GoalCard";
import { TodayNoteCard } from "@/components/progress/TodayNoteCard";
import { ProgressOverview, ProgressCharts } from "@/components/progress/ProgressCharts";
import { ProgressAIInsights } from "@/components/progress/ProgressAIInsights";
import { ExportDataCard } from "@/components/progress/ExportDataCard";

export function ProgressWorkspace() {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-20 animate-pulse rounded-xl border bg-card" />
        <div className="h-28 animate-pulse rounded-xl border bg-card" />
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Tracking and analysis from your Calendar — sessions, notes, and daily reflections.
        </p>
      </div>

      <GoalCard />
      <ProgressOverview />
      <ProgressCharts />
      <TodayNoteCard />
      <ProgressAIInsights />
      <ExportDataCard />
    </div>
  );
}
