"use client";

import * as React from "react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useMemoryStore } from "@/stores/memoryStore";
import type { PlanResponse } from "@/lib/ai/schemas";
import { isUndoInstruction } from "@/lib/parseTimedPlan";
import { previewPlanApply } from "@/lib/planSafety";

function localNowIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00`;
}

export interface PlannerResult {
  summary: string;
  reasoning: string;
  provider: string;
  usedFallback: boolean;
}

function toResult(plan: PlanResponse, provider: string, usedFallback: boolean): PlannerResult {
  return {
    summary: plan.summary,
    reasoning: plan.reasoning ?? "",
    provider,
    usedFallback,
  };
}

function applyPlanSafely(
  events: PlanResponse["events"],
  nowIso: string,
  applyPlan: ReturnType<typeof useScheduleStore.getState>["applyPlan"]
): { ok: true; summaryExtra: string } | { ok: false; error: string } {
  const preview = previewPlanApply(events, nowIso);
  if (preview.eventCount === 0) {
    return {
      ok: false,
      error: "Nothing was changed — the plan only contained past dates.",
    };
  }

  const { applied, droppedPast } = applyPlan(events, nowIso);
  if (applied === 0) {
    return { ok: false, error: "Nothing was changed." };
  }

  const days = preview.targetDays.join(", ");
  let summaryExtra = ` Applied to: ${days}.`;
  if (droppedPast > 0) {
    summaryExtra += ` (${droppedPast} past-dated block(s) skipped.)`;
  }
  return { ok: true, summaryExtra };
}

/**
 * Client hook that sends a natural-language instruction to /api/ai/plan,
 * then applies the rebuilt schedule and any inferred memory to the stores.
 */
export function usePlanner() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [last, setLast] = React.useState<PlannerResult | null>(null);

  const applyPlan = useScheduleStore((s) => s.applyPlan);
  const undo = useScheduleStore((s) => s.undo);
  const mergeMemoryUpdates = useMemoryStore((s) => s.mergeMemoryUpdates);

  const run = React.useCallback(
    async (instruction: string): Promise<PlannerResult | null> => {
      const text = instruction.trim();
      if (!text) return null;

      const nowIso = localNowIso();

      if (isUndoInstruction(text)) {
        const hadHistory = useScheduleStore.getState().past.length > 0;
        undo();
        const result: PlannerResult = {
          summary: hadHistory
            ? "Reverted the last schedule change."
            : "Nothing to undo yet.",
          reasoning: "",
          provider: "local",
          usedFallback: false,
        };
        setLast(result);
        setError(null);
        return result;
      }

      setLoading(true);
      setError(null);
      try {
        const { events, habits } = useScheduleStore.getState();
        const memory = useMemoryStore.getState().snapshot();

        const res = await fetch("/api/ai/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction: text,
            now: nowIso,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            memory,
            events,
            habits,
          }),
        });

        const data = (await res.json()) as PlanResponse & {
          provider?: string;
          usedFallback?: boolean;
          error?: string;
        };

        if (!res.ok || data.error) {
          throw new Error(data.error || `Error ${res.status}`);
        }

        const applied = applyPlanSafely(data.events, nowIso, applyPlan);
        if (!applied.ok) {
          setError(applied.error);
          setLast(null);
          return null;
        }
        if (data.memoryUpdates?.length) mergeMemoryUpdates(data.memoryUpdates);

        const result = toResult(
          {
            ...data,
            summary: (data.summary || "Plan updated.") + applied.summaryExtra,
          },
          data.provider ?? "ai",
          Boolean(data.usedFallback)
        );
        setLast(result);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not build the plan.";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [applyPlan, mergeMemoryUpdates, undo]
  );

  return { run, loading, error, last };
}
