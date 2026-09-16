import type { JobApplication } from "@/types";
import { daysSinceApplied } from "@/lib/jobAnalytics";

export interface FollowUpCandidate {
  application: JobApplication;
  daysWaiting: number;
}

/** Applications in "applied" that need a one-time follow-up (3–5 days). */
export function getFollowUpCandidates(
  apps: JobApplication[],
  afterDays: number,
  now = new Date()
): FollowUpCandidate[] {
  return apps
    .filter((a) => a.status === "applied" && !a.followUpPromptedAt)
    .map((a) => ({ application: a, daysWaiting: daysSinceApplied(a, now) }))
    .filter((x) => x.daysWaiting >= afterDays);
}

/** Applications eligible for auto-ignore suggestion or auto-move. */
export function getStaleCandidates(
  apps: JobApplication[],
  staleDays: number,
  now = new Date()
): FollowUpCandidate[] {
  return apps
    .filter((a) => a.status === "applied" && !a.staleDismissedAt)
    .map((a) => ({ application: a, daysWaiting: daysSinceApplied(a, now) }))
    .filter((x) => x.daysWaiting >= staleDays);
}
