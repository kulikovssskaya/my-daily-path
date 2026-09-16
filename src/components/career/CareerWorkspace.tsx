"use client";

import * as React from "react";
import { CVManager } from "./CVManager";
import { JobSearch } from "./JobSearch";
import { JobTrackerDashboard } from "./JobTrackerDashboard";
import { LinkedInSection } from "./LinkedInSection";
import { useMounted } from "@/hooks/useMounted";

export function CareerWorkspace() {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
        <div className="h-48 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <JobTrackerDashboard />
      <CVManager />
      <JobSearch />
      <LinkedInSection />
    </div>
  );
}
