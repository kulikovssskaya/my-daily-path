import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Trophy } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

const ProgressWorkspace = dynamic(
  () =>
    import("@/components/progress/ProgressWorkspace").then((m) => ({
      default: m.ProgressWorkspace,
    })),
  { loading: () => <div className="text-sm text-muted-foreground">Loading…</div> }
);

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <PageShell
      title="Progress"
      description="Learning, applications and your long-term goal"
      icon={<Trophy className="size-5" />}
    >
      <ProgressWorkspace />
    </PageShell>
  );
}
