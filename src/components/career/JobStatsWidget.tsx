"use client";

import * as React from "react";
import { BarChart3, Briefcase, Calendar, TrendingUp, Users } from "lucide-react";
import { computeJobTrackerStats } from "@/lib/jobAnalytics";
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
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-lg font-semibold leading-none">{value}</div>
        <div className="truncate text-[11px] text-muted-foreground">{label}</div>
        {hint ? (
          <div className="truncate text-[10px] text-muted-foreground/80">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

function MiniBarChart({
  data,
}: {
  data: { label: string; count: number; key: string }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height: 88 }}>
      {data.map((d) => (
        <div key={d.key} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-muted-foreground">
            {d.count > 0 ? d.count : ""}
          </span>
          <div
            className="w-full rounded-t bg-primary/70 transition-all"
            style={{ height: `${Math.max(4, (d.count / max) * 64)}px` }}
            title={`${d.label}: ${d.count}`}
          />
          <span className="text-[9px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function FunnelBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

export function JobStatsWidget({ applications }: { applications: JobApplication[] }) {
  const stats = React.useMemo(
    () => computeJobTrackerStats(applications),
    [applications]
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <BarChart3 className="size-4" />
        </span>
        <CardTitle className="text-sm">Статистика откликов</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon={Calendar} label="Сегодня" value={String(stats.today)} />
          <StatTile icon={Calendar} label="Вчера" value={String(stats.yesterday)} />
          <StatTile icon={TrendingUp} label="За неделю" value={String(stats.thisWeek)} />
          <StatTile
            icon={Briefcase}
            label="В работе"
            value={String(stats.activeCount)}
            hint={`всего ${stats.totalCount}`}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Users className="size-3.5" />
              Отклики за 7 дней
            </div>
            <MiniBarChart data={stats.dailyCounts} />
          </div>
          <div className="space-y-3">
            <div className="text-xs font-medium">Воронка конверсии</div>
            <FunnelBar label="→ Интервью" pct={stats.interviewRate} color="bg-emerald-500" />
            <FunnelBar label="→ Отказ" pct={stats.rejectionRate} color="bg-red-400" />
            <FunnelBar label="→ Игнор" pct={stats.ignoreRate} color="bg-amber-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
