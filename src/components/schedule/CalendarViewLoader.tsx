"use client";

import dynamic from "next/dynamic";

const CalendarView = dynamic(
  () => import("@/components/schedule/CalendarView").then((m) => ({ default: m.CalendarView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        Loading calendar…
      </div>
    ),
  }
);

export function CalendarViewLoader() {
  return <CalendarView />;
}
