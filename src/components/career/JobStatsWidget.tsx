"use client";

import * as React from "react";
import { computeJobTrackerStats, STATUS_LABELS_RU } from "@/lib/jobAnalytics";
import type { JobApplication } from "@/types";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="text-xl font-semibold tabular-nums leading-none">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function BarChart({
  data,
  emptyLabel,
}: {
  data: { label: string; count: number; key: string }[];
  emptyLabel: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const hasAny = data.some((d) => d.count > 0);

  return (
    <div>
      {!hasAny ? (
        <p className="mb-2 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : null}
      <div className="flex items-end gap-1.5" style={{ height: 72 }}>
        {data.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {d.count > 0 ? d.count : ""}
            </span>
            <div
              className="w-full rounded-sm bg-primary/75"
              style={{ height: `${Math.max(d.count > 0 ? 6 : 2, (d.count / max) * 52)}px` }}
              title={`${d.label}: ${d.count}`}
            />
            <span className="max-w-full truncate text-center text-[9px] text-muted-foreground">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelRow({
  label,
  count,
  pct,
  barClass,
}: {
  label: string;
  count: number;
  pct: number;
  barClass: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">{count}</span>
      <span className="w-10 text-right tabular-nums text-xs text-muted-foreground">
        {pct.toFixed(0)}%
      </span>
      <div className="col-span-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function JobStatsWidget({ applications }: { applications: JobApplication[] }) {
  const stats = React.useMemo(
    () => computeJobTrackerStats(applications),
    [applications]
  );

  const waiting = stats.byStatus.applied;

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-medium">Статистика</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Сегодня" value={stats.today} />
        <Metric label="Вчера" value={stats.yesterday} />
        <Metric label="Эта неделя" value={stats.thisWeek} />
        <Metric label="Прошлая неделя" value={stats.lastWeek} />
        <Metric label="Ждут ответа" value={waiting} />
        <Metric label="Всего откликов" value={stats.sentTotal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">По дням (7 дней)</h3>
          <BarChart data={stats.dailyCounts} emptyLabel="Пока нет откликов за последние 7 дней" />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">По неделям (4 недели)</h3>
          <BarChart data={stats.weeklyCounts} emptyLabel="Пока нет откликов за последние 4 недели" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2.5">
          <h3 className="text-xs font-medium text-muted-foreground">
            Конверсия (от всех {stats.sentTotal} откликов)
          </h3>
          <FunnelRow
            label={STATUS_LABELS_RU.interview}
            count={stats.byStatus.interview}
            pct={stats.interviewRate}
            barClass="bg-emerald-500"
          />
          <FunnelRow
            label={STATUS_LABELS_RU.rejected}
            count={stats.byStatus.rejected}
            pct={stats.rejectionRate}
            barClass="bg-red-400"
          />
          <FunnelRow
            label={STATUS_LABELS_RU.ignored}
            count={stats.byStatus.ignored}
            pct={stats.ignoreRate}
            barClass="bg-amber-400"
          />
          <FunnelRow
            label={STATUS_LABELS_RU.offer}
            count={stats.byStatus.offer}
            pct={stats.offerRate}
            barClass="bg-violet-500"
          />
          <div className="border-t pt-2 text-xs text-muted-foreground">
            Есть ответ (не «ждут»):{" "}
            <span className="font-medium text-foreground">{stats.responseRate.toFixed(0)}%</span>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">По статусам</h3>
          {(
            [
              ["applied", stats.byStatus.applied],
              ["interview", stats.byStatus.interview],
              ["rejected", stats.byStatus.rejected],
              ["ignored", stats.byStatus.ignored],
              ["offer", stats.byStatus.offer],
            ] as const
          ).map(([status, count]) => (
            <div key={status} className="flex justify-between border-b border-dashed py-1 last:border-0">
              <span className="text-muted-foreground">{STATUS_LABELS_RU[status]}</span>
              <span className="tabular-nums font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
