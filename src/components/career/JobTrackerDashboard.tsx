"use client";

import * as React from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import { filterApplications, STATUS_LABELS_RU, TRACKER_STATUSES } from "@/lib/jobAnalytics";
import type { ApplicationStatus } from "@/types";
import { JobAddForm } from "./JobAddForm";
import { JobStatsWidget } from "./JobStatsWidget";
import { JobKanbanBoard } from "./JobKanbanBoard";
import { JobRemindersBanner } from "./JobRemindersBanner";
import { MonitorSyncCard } from "./MonitorSyncCard";

export function JobTrackerDashboard() {
  const applications = useCareerStore((s) => s.applications);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ApplicationStatus | "all">("all");
  const [view, setView] = React.useState<"kanban" | "table">("table");

  const filtered = React.useMemo(
    () => filterApplications(applications, query, statusFilter),
    [applications, query, statusFilter]
  );

  return (
    <div className="space-y-6">
      <JobAddForm />

      <JobStatsWidget applications={applications} />

      <JobRemindersBanner />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск…"
                className="w-40 rounded-md border bg-background py-1.5 pl-8 pr-2 text-sm sm:w-52"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ApplicationStatus | "all")
              }
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="all">Все</option>
              {TRACKER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS_RU[s]}
                </option>
              ))}
            </select>
            <div className="flex rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => setView("table")}
                className={`rounded px-2 py-1 ${view === "table" ? "bg-muted" : ""}`}
                title="Список"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={`rounded px-2 py-1 ${view === "kanban" ? "bg-muted" : ""}`}
                title="Колонки"
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            {applications.length === 0
              ? "Пока пусто. Вставь ссылку сверху или нажми «Отправила» в боте."
              : "Ничего не найдено"}
          </p>
        ) : (
          <JobKanbanBoard applications={filtered} view={view} />
        )}
      </div>

      <MonitorSyncCard />
    </div>
  );
}
