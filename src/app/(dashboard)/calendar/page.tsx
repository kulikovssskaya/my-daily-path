import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CalendarWorkspace } from "@/components/schedule/CalendarWorkspace";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      description="Learning sessions — drag to move, click to edit, select a slot to add"
      icon={<CalendarDays className="size-5" />}
    >
      <CalendarWorkspace />
    </PageShell>
  );
}
