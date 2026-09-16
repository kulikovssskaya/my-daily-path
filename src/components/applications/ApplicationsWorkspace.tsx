"use client";

import * as React from "react";
import { JobTrackerDashboard } from "@/components/career/JobTrackerDashboard";
import { useMounted } from "@/hooks/useMounted";

export function ApplicationsWorkspace() {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
        <div className="h-48 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl">
      <JobTrackerDashboard />
    </div>
  );
}
