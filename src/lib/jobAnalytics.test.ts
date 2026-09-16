import { describe, expect, it } from "vitest";
import {
  computeJobTrackerStats,
  countApplicationsOnDate,
  filterApplications,
  daysSinceApplied,
  isStaleApplication,
} from "@/lib/jobAnalytics";
import type { JobApplication } from "@/types";

const base = (overrides: Partial<JobApplication>): JobApplication => ({
  id: "1",
  company: "Acme",
  role: "ML Engineer",
  status: "applied",
  appliedAt: "2026-09-16T10:00:00.000Z",
  createdAt: "2026-09-16T10:00:00.000Z",
  ...overrides,
});

describe("jobAnalytics", () => {
  it("counts applications by date", () => {
    const apps = [
      base({ id: "a", appliedAt: "2026-09-16T10:00:00.000Z" }),
      base({ id: "b", appliedAt: "2026-09-15T10:00:00.000Z" }),
    ];
    expect(countApplicationsOnDate(apps, "2026-09-16")).toBe(1);
    expect(countApplicationsOnDate(apps, "2026-09-15")).toBe(1);
  });

  it("computes funnel stats", () => {
    const apps = [
      base({ id: "1", status: "applied" }),
      base({ id: "2", status: "interview" }),
      base({ id: "3", status: "rejected" }),
    ];
    const stats = computeJobTrackerStats(apps, new Date("2026-09-16T12:00:00Z"));
    expect(stats.totalCount).toBe(3);
    expect(stats.activeCount).toBe(2);
    expect(stats.byStatus.interview).toBe(1);
    expect(stats.sentTotal).toBe(3);
    expect(stats.weeklyCounts).toHaveLength(4);
  });

  it("filters by query and status", () => {
    const apps = [
      base({ id: "1", company: "Yandex", role: "Analyst" }),
      base({ id: "2", company: "Google", role: "Engineer", status: "interview" }),
    ];
    expect(filterApplications(apps, "yandex", "all")).toHaveLength(1);
    expect(filterApplications(apps, "", "interview")).toHaveLength(1);
  });

  it("detects stale applications", () => {
    const app = base({
      appliedAt: "2026-09-01T10:00:00.000Z",
      status: "applied",
    });
    expect(daysSinceApplied(app, new Date("2026-09-16T10:00:00Z"))).toBe(15);
    expect(isStaleApplication(app, 14, new Date("2026-09-16T10:00:00Z"))).toBe(true);
  });
});
