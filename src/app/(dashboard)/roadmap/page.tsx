import type { Metadata } from "next";
import dynamic from "next/dynamic";

const BootcampSchedule = dynamic(
  () => import("@/components/roadmap/BootcampSchedule"),
  {
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading bootcamp…
      </div>
    ),
  }
);

export const metadata: Metadata = { title: "Bootcamp" };

export default function RoadmapPage() {
  return (
    <div className="h-full overflow-y-auto">
      <BootcampSchedule />
    </div>
  );
}
