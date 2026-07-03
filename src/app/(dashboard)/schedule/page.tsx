import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { ScheduleWorkspace } from "@/components/schedule/ScheduleWorkspace";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <PageShell
      title="Schedule"
      description="AI planner for today and tomorrow"
      icon={<Calendar className="size-5" />}
    >
      <ScheduleWorkspace />
    </PageShell>
  );
}
