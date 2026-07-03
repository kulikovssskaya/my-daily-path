import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CalendarViewLoader } from "@/components/schedule/CalendarViewLoader";
import { RizeSyncBar } from "@/components/schedule/RizeSyncBar";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <PageShell
      title="Calendar"
      description="Day / week / month / list — drag to move, click to edit"
      icon={<CalendarDays className="size-5" />}
    >
      <div className="mx-auto max-w-6xl space-y-3">
        <RizeSyncBar />
        <CalendarViewLoader />
      </div>
    </PageShell>
  );
}
