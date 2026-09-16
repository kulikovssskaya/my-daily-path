import type { ApplicationStatus, JobApplication, JobTrackerStats } from "@/types";

export const TRACKER_STATUSES: ApplicationStatus[] = [
  "applied",
  "interview",
  "rejected",
  "ignored",
];

export const STATUS_LABELS_RU: Record<ApplicationStatus, string> = {
  saved: "Сохранено",
  preparing: "Готовлю",
  applied: "Откликнулась",
  interview: "Интервью",
  rejected: "Отказ",
  ignored: "Игнор",
  offer: "Оффер",
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

  const withOutcome = apps.filter((a) => a.status !== "saved" && a.status !== "preparing")
    .length;

  const dailyCounts: JobTrackerStats["dailyCounts"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    dailyCounts.push({
      key,
      label: d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" }),
      count: countApplicationsOnDate(apps, key),
    });
  }

  const appliedTotal = apps.filter((a) =>
    ["applied", "interview", "rejected", "ignored", "offer"].includes(a.status)
  ).length;

  return {
    today: countApplicationsOnDate(apps, todayKey),
    yesterday: countApplicationsOnDate(apps, yesterdayKey),
    thisWeek: apps.filter((a) => {
      const k = appliedDateKey(a);
      return k != null && k >= weekStartKey && k <= todayKey;
    }).length,
    activeCount: apps.filter((a) => ["applied", "interview"].includes(a.status)).length,
    totalCount: apps.length,
    interviewRate: withOutcome > 0 ? (byStatus.interview / withOutcome) * 100 : 0,
    rejectionRate: withOutcome > 0 ? (byStatus.rejected / withOutcome) * 100 : 0,
    ignoreRate: appliedTotal > 0 ? (byStatus.ignored / appliedTotal) * 100 : 0,
    byStatus,
    dailyCounts,
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
