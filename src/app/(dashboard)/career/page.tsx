import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Briefcase } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

const CareerWorkspace = dynamic(
  () => import("@/components/career/CareerWorkspace").then((m) => ({ default: m.CareerWorkspace })),
  { loading: () => <div className="text-sm text-muted-foreground">Loading…</div> }
);

export const metadata: Metadata = { title: "Work / Career" };

export default function CareerPage() {
  return (
    <PageShell
      title="Work / Career"
      description="CV, jobs and LinkedIn"
      icon={<Briefcase className="size-5" />}
    >
      <CareerWorkspace />
    </PageShell>
  );
}
