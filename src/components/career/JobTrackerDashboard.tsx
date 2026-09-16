"use client";

import * as React from "react";
import { Briefcase, LayoutGrid, List, Search } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import { filterApplications, STATUS_LABELS_RU, TRACKER_STATUSES } from "@/lib/jobAnalytics";
import type { ApplicationStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobAddForm } from "./JobAddForm";
import { JobStatsWidget } from "./JobStatsWidget";
import { JobKanbanBoard } from "./JobKanbanBoard";
import { JobRemindersBanner } from "./JobRemindersBanner";
import { MonitorSyncCard } from "./MonitorSyncCard";

export function JobTrackerDashboard() {
  const applications = useCareerStore((s) => s.applications);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ApplicationStatus | "all">("all");
  const [view, setView] = React.useState<"kanban" | "table">("kanban");

  const filtered = React.useMemo(
    () => filterApplications(applications, query, statusFilter),
    [applications, query, statusFilter]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">Трекер откликов</CardTitle>
            <p className="text-xs text-muted-foreground">
              Kanban, парсинг ссылок, напоминания и аналитика
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <JobAddForm />
          <JobRemindersBanner />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск: позиция, компания, дата…"
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ApplicationStatus | "all")
              }
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Все статусы</option>
              {TRACKER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS_RU[s]}
                </option>
              ))}
            </select>
            <div className="flex rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={`rounded px-2 py-1.5 ${view === "kanban" ? "bg-muted" : ""}`}
                title="Kanban"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`rounded px-2 py-1.5 ${view === "table" ? "bg-muted" : ""}`}
                title="Таблица"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              {applications.length === 0
                ? "Пока нет откликов — добавьте ссылку на вакансию выше"
                : "Ничего не найдено по фильтрам"}
            </p>
          ) : (
            <JobKanbanBoard applications={filtered} view={view} />
          )}
        </CardContent>
      </Card>

      <JobStatsWidget applications={applications} />
      <MonitorSyncCard />
    </div>
  );
}
