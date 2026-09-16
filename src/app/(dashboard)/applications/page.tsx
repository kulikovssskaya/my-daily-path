import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Briefcase } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

const ApplicationsWorkspace = dynamic(
  () =>
    import("@/components/applications/ApplicationsWorkspace").then((m) => ({
      default: m.ApplicationsWorkspace,
    })),
  { loading: () => <div className="text-sm text-muted-foreground">Loading…</div> }
);

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <PageShell
      title="Applications"
      description="Track jobs you applied to"
      icon={<Briefcase className="size-5" />}
    >
      <ApplicationsWorkspace />
    </PageShell>
  );
}
