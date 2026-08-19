"use client";

import { useMounted } from "@/hooks/useMounted";
import {
  ProgressOverview,
  ProgressByActivity,
  ProgressCharts,
} from "@/components/progress/ProgressCharts";
import { EveningWrapCard } from "@/components/progress/EveningWrapCard";
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
          Hours from completed Learning events on Calendar (end − start). Mark sessions done
          for them to count.
        </p>
      </div>

      <ProgressCharts />
      <ProgressOverview />
      <ProgressByActivity />
      <div id="evening-wrap">
        <EveningWrapCard />
      </div>
      <ExportDataCard />
    </div>
  );
}
