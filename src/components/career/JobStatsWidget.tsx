"use client";

import * as React from "react";
import {
  BarChart3,
  Briefcase,
  CalendarCheck,
  Clock,
  Send,
  TrendingUp,
} from "lucide-react";
import { computeJobTrackerStats, STATUS_LABELS_RU } from "@/lib/jobAnalytics";
import type { JobApplication } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-none tabular-nums">{value}</div>
          <div className="truncate text-[11px] text-muted-foreground">{label}</div>
          {hint ? (
            <div className="truncate text-[10px] text-muted-foreground/80">{hint}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function BarChart({
  data,
  maxHeight = 100,
}: {
  data: { label: string; value: number; key: string }[];
  maxHeight?: number;
}) {
  const max = Math.max(0.1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: maxHeight + 28 }}>
      {data.map((d) => (
        <div key={d.key} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {d.value > 0 ? d.value : ""}
          </span>
          <div
            className="w-full rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all"
            style={{ height: `${(d.value / max) * maxHeight}px`, minHeight: d.value > 0 ? 4 : 2 }}
          />
          <span className="max-w-full truncate text-center text-[10px] text-muted-foreground">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBar({
  label,
  count,
  pct,
  maxPct,
}: {
  label: string;
  count: number;
  pct: number;
  maxPct: number;
}) {
  const width = maxPct > 0 ? (pct / maxPct) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">{label}</span>
        <span className="shrink-0 text-muted-foreground">
          {count} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary"
          style={{ width: `${width}%` }}
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

  const weekTrendPct =
    stats.lastWeek > 0
      ? Math.round(((stats.thisWeek - stats.lastWeek) / stats.lastWeek) * 100)
      : null;

  const funnelRows = [
    { label: STATUS_LABELS_RU.interview, count: stats.byStatus.interview, pct: stats.interviewRate },
    { label: STATUS_LABELS_RU.rejected, count: stats.byStatus.rejected, pct: stats.rejectionRate },
    { label: STATUS_LABELS_RU.ignored, count: stats.byStatus.ignored, pct: stats.ignoreRate },
    { label: STATUS_LABELS_RU.offer, count: stats.byStatus.offer, pct: stats.offerRate },
  ];
  const maxFunnelPct = Math.max(1, ...funnelRows.map((r) => r.pct));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Clock}
          label="Сегодня"
          value={String(stats.today)}
          hint="откликов за сегодня"
        />
        <StatTile
          icon={CalendarCheck}
          label="Эта неделя"
          value={String(stats.thisWeek)}
          hint={
            weekTrendPct !== null
              ? `${weekTrendPct >= 0 ? "+" : ""}${weekTrendPct}% vs прошлая неделя`
              : `${stats.lastWeek} на прошлой неделе`
          }
        />
        <StatTile
          icon={Send}
          label="Ждут ответа"
          value={String(stats.byStatus.applied)}
          hint="статус «Откликнулась»"
        />
        <StatTile
          icon={TrendingUp}
          label="Всего"
          value={String(stats.sentTotal)}
          hint={`${stats.responseRate.toFixed(0)}% получили ответ`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
            <BarChart3 className="size-4 text-primary" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm">Отклики по дням</CardTitle>
              <p className="text-xs text-muted-foreground">Последние 7 дней</p>
            </div>
            {weekTrendPct !== null && (
              <span
                className={`text-xs tabular-nums ${weekTrendPct >= 0 ? "text-emerald-600" : "text-amber-600"}`}
              >
                {weekTrendPct >= 0 ? "+" : ""}
                {weekTrendPct}% vs прошлая неделя
              </span>
            )}
          </CardHeader>
          <CardContent>
            {stats.dailyCounts.some((d) => d.count > 0) ? (
              <BarChart
                data={stats.dailyCounts.map((d) => ({
                  key: d.key,
                  label: d.label,
                  value: d.count,
                }))}
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Пока нет откликов за последние 7 дней
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="size-4 text-primary" />
              <div>
                <CardTitle className="text-sm">По неделям</CardTitle>
                <p className="text-xs text-muted-foreground">Откликов за каждую неделю</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stats.weeklyCounts.some((w) => w.count > 0) ? (
              <BarChart
                maxHeight={90}
                data={stats.weeklyCounts.map((w) => ({
                  key: w.key,
                  label: w.label,
                  value: w.count,
                }))}
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Пока нет откликов за последние 4 недели
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Briefcase className="size-4 text-primary" />
            <div>
              <CardTitle className="text-sm">Конверсия и статусы</CardTitle>
              <p className="text-xs text-muted-foreground">
                Из {stats.sentTotal} откликов · {stats.activeCount} в работе
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.sentTotal === 0 ? (
            <p className="text-sm text-muted-foreground">
              Добавь первый отклик — здесь появится воронка.
            </p>
          ) : (
            <>
              <StatusBar
                label={STATUS_LABELS_RU.applied}
                count={stats.byStatus.applied}
                pct={stats.sentTotal > 0 ? (stats.byStatus.applied / stats.sentTotal) * 100 : 0}
                maxPct={100}
              />
              {funnelRows.map((row) => (
                <StatusBar
                  key={row.label}
                  label={row.label}
                  count={row.count}
                  pct={row.pct}
                  maxPct={maxFunnelPct}
                />
              ))}
            </>
          )}
          {stats.sentTotal > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Интервью: {stats.interviewRate.toFixed(0)}% · Отказ: {stats.rejectionRate.toFixed(0)}%
              % · Игнор: {stats.ignoreRate.toFixed(0)}%
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
