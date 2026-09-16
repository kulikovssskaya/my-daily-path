"use client";

import * as React from "react";
import { Send, Trash2 } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import type { ApplicationStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  preparing: "Preparing",
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  ignored: "Ignored",
  offer: "Offer",
};

export function ApplicationsList() {
  const applications = useCareerStore((s) => s.applications);
  const setStatus = useCareerStore((s) => s.setApplicationStatus);
  const remove = useCareerStore((s) => s.removeApplication);

  if (applications.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Send className="size-4" />
        </span>
        <CardTitle className="text-sm">My applications ({applications.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {applications.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium">{a.role}</span>
                <span className="ml-1 text-muted-foreground">@ {a.company}</span>
              </div>
              <select
                value={a.status}
                onChange={(e) => setStatus(a.id, e.target.value as ApplicationStatus)}
                className="rounded-md border bg-background px-2 py-1 text-xs"
              >
                {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(a.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
