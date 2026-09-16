"use client";

import * as React from "react";
import { computeJobTrackerStats, STATUS_LABELS_RU } from "@/lib/jobAnalytics";
import type { JobApplication } from "@/types";

export function JobStatsWidget({ applications }: { applications: JobApplication[] }) {
  const stats = React.useMemo(
    () => computeJobTrackerStats(applications),
    [applications]
  );

  if (applications.length === 0) return null;

  const chips = [
    { label: "сегодня", value: stats.today },
    { label: "за неделю", value: stats.thisWeek },
    { label: "в работе", value: stats.activeCount },
    { label: STATUS_LABELS_RU.interview, value: stats.byStatus.interview },
    { label: STATUS_LABELS_RU.rejected, value: stats.byStatus.rejected },
    { label: STATUS_LABELS_RU.ignored, value: stats.byStatus.ignored },
  ];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {chips.map((c) => (
        <span key={c.label}>
          <span className="font-semibold text-foreground">{c.value}</span>{" "}
          {c.label}
        </span>
      ))}
    </div>
  );
}
