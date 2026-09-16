"use client";

import * as React from "react";
import { ExternalLink, GripVertical, Pencil, Trash2 } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import {
  TRACKER_STATUSES,
  STATUS_LABELS_RU,
  daysSinceApplied,
  isStaleApplication,
} from "@/lib/jobAnalytics";
import type { ApplicationStatus, JobApplication } from "@/types";
import { cn } from "@/lib/utils";

const COLUMN_STYLES: Record<ApplicationStatus, string> = {
  saved: "border-muted",
  preparing: "border-muted",
  applied: "border-blue-200 dark:border-blue-900",
  interview: "border-emerald-200 dark:border-emerald-900",
  rejected: "border-red-200 dark:border-red-900",
  ignored: "border-amber-200 dark:border-amber-900",
  offer: "border-violet-200 dark:border-violet-900",
};

function JobCard({
  app,
  staleDays,
  onEdit,
}: {
  app: JobApplication;
  staleDays: number;
  onEdit: (app: JobApplication) => void;
}) {
  const setStatus = useCareerStore((s) => s.setApplicationStatus);
  const remove = useCareerStore((s) => s.removeApplication);
  const stale = isStaleApplication(app, staleDays);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/id", app.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group rounded-lg border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md",
        stale && "ring-2 ring-amber-400/60"
      )}
    >
      <div className="mb-2 flex items-start gap-1">
        <GripVertical className="mt-0.5 size-3.5 shrink-0 cursor-grab text-muted-foreground opacity-40 group-hover:opacity-100" />
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-snug">{app.role}</div>
          <div className="text-xs text-muted-foreground">{app.company}</div>
        </div>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(app)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => remove(app.id)}
            className="rounded p-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {app.description ? (
        <p className="mb-2 line-clamp-2 text-[11px] text-muted-foreground">{app.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        {app.appliedAt ? (
          <span>{app.appliedAt.slice(0, 10)} · {daysSinceApplied(app)} дн.</span>
        ) : null}
        {stale ? <span className="font-medium text-amber-600">Долго без ответа</span> : null}
        {app.url ? (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-3" />
            Ссылка
          </a>
        ) : null}
      </div>

      <select
        value={app.status}
        onChange={(e) => setStatus(app.id, e.target.value as ApplicationStatus)}
        className="mt-2 w-full rounded border bg-background px-2 py-1 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {TRACKER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS_RU[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

function EditDialog({
  app,
  onClose,
}: {
  app: JobApplication;
  onClose: () => void;
}) {
  const update = useCareerStore((s) => s.updateApplication);
  const [role, setRole] = React.useState(app.role);
  const [company, setCompany] = React.useState(app.company);
  const [notes, setNotes] = React.useState(app.notes ?? "");
  const [url, setUrl] = React.useState(app.url ?? "");

  const save = () => {
    update(app.id, { role, company, notes, url });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-xl border bg-card p-4 shadow-lg">
        <h3 className="font-medium">Редактировать отклик</h3>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Позиция"
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Компания"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="URL"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Заметки"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm">
            Отмена
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

export function JobKanbanBoard({
  applications,
  view,
}: {
  applications: JobApplication[];
  view: "kanban" | "table";
}) {
  const setStatus = useCareerStore((s) => s.setApplicationStatus);
  const settings = useCareerStore((s) => s.jobTrackerSettings);
  const [editing, setEditing] = React.useState<JobApplication | null>(null);
  const [dragOver, setDragOver] = React.useState<ApplicationStatus | null>(null);

  const byStatus = React.useMemo(() => {
    const map = Object.fromEntries(
      TRACKER_STATUSES.map((s) => [s, [] as JobApplication[]])
    ) as Record<ApplicationStatus, JobApplication[]>;
    for (const app of applications) {
      if (TRACKER_STATUSES.includes(app.status)) {
        map[app.status].push(app);
      } else {
        map.applied.push(app);
      }
    }
    return map;
  }, [applications]);

  const onDrop = (status: ApplicationStatus, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("application/id");
    if (id) setStatus(id, status);
    setDragOver(null);
  };

  if (view === "table") {
    return (
      <>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Позиция</th>
                <th className="px-3 py-2">Компания</th>
                <th className="px-3 py-2">Дата</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{app.role}</td>
                  <td className="px-3 py-2 text-muted-foreground">{app.company}</td>
                  <td className="px-3 py-2 text-xs">
                    {(app.appliedAt ?? app.createdAt)?.slice(0, 10) ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={app.status}
                      onChange={(e) =>
                        setStatus(app.id, e.target.value as ApplicationStatus)
                      }
                      className="rounded border bg-background px-2 py-1 text-xs"
                    >
                      {TRACKER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS_RU[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    {app.url ? (
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        ↗
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editing ? <EditDialog app={editing} onClose={() => setEditing(null)} /> : null}
      </>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TRACKER_STATUSES.map((status) => (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => onDrop(status, e)}
            className={cn(
              "flex min-h-[200px] flex-col rounded-xl border-2 border-dashed p-2 transition-colors",
              COLUMN_STYLES[status],
              dragOver === status && "bg-accent/50"
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold">{STATUS_LABELS_RU[status]}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                {byStatus[status].length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {byStatus[status].map((app) => (
                <JobCard
                  key={app.id}
                  app={app}
                  staleDays={settings.autoIgnoreAfterDays}
                  onEdit={setEditing}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {editing ? <EditDialog app={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
