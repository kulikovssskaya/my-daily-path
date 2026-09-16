"use client";

import * as React from "react";
import { Bell, Clock, X } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import { STATUS_LABELS_RU } from "@/lib/jobAnalytics";
import { getFollowUpCandidates, getStaleCandidates } from "@/lib/jobReminders";
import type { ApplicationStatus } from "@/types";

export function JobRemindersBanner() {
  const applications = useCareerStore((s) => s.applications);
  const settings = useCareerStore((s) => s.jobTrackerSettings);
  const setStatus = useCareerStore((s) => s.setApplicationStatus);
  const markFollowUp = useCareerStore((s) => s.markFollowUpPrompted);
  const dismissStale = useCareerStore((s) => s.dismissStale);

  const followUps = React.useMemo(
    () => getFollowUpCandidates(applications, settings.followUpAfterDays),
    [applications, settings.followUpAfterDays]
  );

  const stale = React.useMemo(
    () => getStaleCandidates(applications, settings.autoIgnoreAfterDays),
    [applications, settings.autoIgnoreAfterDays]
  );

  if (followUps.length === 0 && stale.length === 0) return null;

  const handleStatus = (id: string, status: ApplicationStatus) => {
    setStatus(id, status);
    markFollowUp(id);
  };

  return (
    <div className="space-y-2">
      {followUps.map(({ application, daysWaiting }) => (
        <div
          key={`fu-${application.id}`}
          className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Bell className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <div>
              <p className="font-medium">
                Что по вакансии «{application.role}» @ {application.company}?
              </p>
              <p className="text-xs text-muted-foreground">
                Отклик {daysWaiting} дн. назад
                {application.url ? (
                  <>
                    {" · "}
                    <a
                      href={application.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Открыть вакансию
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["interview", "rejected", "ignored"] as ApplicationStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStatus(application.id, s)}
                className="rounded-md border bg-background px-2.5 py-1 text-xs hover:bg-muted"
              >
                {STATUS_LABELS_RU[s]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => markFollowUp(application.id)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Позже
            </button>
          </div>
        </div>
      ))}

      {stale.map(({ application, daysWaiting }) => (
        <div
          key={`st-${application.id}`}
          className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">
                «{application.role}» — {daysWaiting} дней без ответа
              </p>
              <p className="text-xs text-muted-foreground">
                Перевести в «Игнор» или «Отказ»?
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setStatus(application.id, "ignored");
                dismissStale(application.id);
              }}
              className="rounded-md border bg-background px-2.5 py-1 text-xs"
            >
              → Игнор
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus(application.id, "rejected");
                dismissStale(application.id);
              }}
              className="rounded-md border bg-background px-2.5 py-1 text-xs"
            >
              → Отказ
            </button>
            <button
              type="button"
              onClick={() => dismissStale(application.id)}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              title="Скрыть"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
