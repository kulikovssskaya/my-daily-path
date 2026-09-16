import type { ApplicationStatus, JobApplication, JobTrackerStats } from "@/types";

export const TRACKER_STATUSES: ApplicationStatus[] = [
  "applied",
  "interview",
  "rejected",
  "ignored",
];

export const STATUS_LABELS_RU: Record<ApplicationStatus, string> = {
  saved: "Saved",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  ignored: "Ignored",
  offer: "Offer",
};

export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function appliedDateKey(app: JobApplication): string | null {
  const iso = app.appliedAt ?? app.createdAt;
  return iso ? iso.slice(0, 10) : null;
}

export function countApplicationsOnDate(
  apps: JobApplication[],
  key: string
): number {
  return apps.filter((a) => appliedDateKey(a) === key).length;
}

export function computeJobTrackerStats(
  apps: JobApplication[],
  endDate = new Date()
): JobTrackerStats {
  const todayKey = dateKey(endDate);
  const yesterday = new Date(endDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);

  const weekStart = new Date(endDate);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartKey = dateKey(weekStart);

  const prevWeekEnd = new Date(endDate);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
  const prevWeekStart = new Date(prevWeekEnd);
  prevWeekStart.setDate(prevWeekStart.getDate() - 6);
  const prevWeekStartKey = dateKey(prevWeekStart);
  const prevWeekEndKey = dateKey(prevWeekEnd);

  const byStatus = {} as Record<ApplicationStatus, number>;
  for (const s of [
    "saved",
    "preparing",
    "applied",
    "interview",
    "rejected",
    "ignored",
    "offer",
  ] as ApplicationStatus[]) {
    byStatus[s] = 0;
  }
  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }

  const dailyCounts: JobTrackerStats["dailyCounts"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    dailyCounts.push({
      key,
      label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
      count: countApplicationsOnDate(apps, key),
    });
  }

  const weeklyCounts: JobTrackerStats["weeklyCounts"] = [];
  for (let w = 0; w < 4; w++) {
    const wEnd = new Date(endDate);
    wEnd.setDate(wEnd.getDate() - w * 7);
    const wStart = new Date(wEnd);
    wStart.setDate(wStart.getDate() - 6);
    const startKey = dateKey(wStart);
    const endKey = dateKey(wEnd);
    const count = apps.filter((a) => {
      const k = appliedDateKey(a);
      return k != null && k >= startKey && k <= endKey;
    }).length;
    const label =
      w === 0
        ? "This week"
        : `${wStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    weeklyCounts.push({ key: startKey, label, count });
  }

  const sentTotal = apps.filter((a) =>
    ["applied", "interview", "rejected", "ignored", "offer"].includes(a.status)
  ).length;

  const responded = byStatus.interview + byStatus.rejected + byStatus.ignored + byStatus.offer;

  return {
    today: countApplicationsOnDate(apps, todayKey),
    yesterday: countApplicationsOnDate(apps, yesterdayKey),
    thisWeek: apps.filter((a) => {
      const k = appliedDateKey(a);
      return k != null && k >= weekStartKey && k <= todayKey;
    }).length,
    lastWeek: apps.filter((a) => {
      const k = appliedDateKey(a);
      return k != null && k >= prevWeekStartKey && k <= prevWeekEndKey;
    }).length,
    activeCount: apps.filter((a) => ["applied", "interview"].includes(a.status)).length,
    totalCount: apps.length,
    sentTotal,
    interviewRate: sentTotal > 0 ? (byStatus.interview / sentTotal) * 100 : 0,
    rejectionRate: sentTotal > 0 ? (byStatus.rejected / sentTotal) * 100 : 0,
    ignoreRate: sentTotal > 0 ? (byStatus.ignored / sentTotal) * 100 : 0,
    offerRate: sentTotal > 0 ? (byStatus.offer / sentTotal) * 100 : 0,
    responseRate: sentTotal > 0 ? (responded / sentTotal) * 100 : 0,
    byStatus,
    dailyCounts,
    weeklyCounts,
  };
}

export function filterApplications(
  apps: JobApplication[],
  query: string,
  statusFilter: ApplicationStatus | "all"
): JobApplication[] {
  const q = query.trim().toLowerCase();
  return apps.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (!q) return true;
    const hay = [a.role, a.company, a.description ?? "", a.url ?? "", a.notes ?? ""]
      .join(" ")
      .toLowerCase();
    const dateStr = appliedDateKey(a) ?? "";
    return hay.includes(q) || dateStr.includes(q);
  });
}

export function daysSinceApplied(app: JobApplication, now = new Date()): number {
  const iso = app.appliedAt ?? app.createdAt;
  if (!iso) return 0;
  const ms = now.getTime() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

export function isStaleApplication(
  app: JobApplication,
  staleDays: number,
  now = new Date()
): boolean {
  if (app.status !== "applied") return false;
  if (app.staleDismissedAt) return false;
  return daysSinceApplied(app, now) >= staleDays;
}
