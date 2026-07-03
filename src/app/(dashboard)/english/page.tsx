import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Languages } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

const EnglishWorkspace = dynamic(
  () =>
    import("@/components/english/EnglishWorkspace").then((m) => ({
      default: m.EnglishWorkspace,
    })),
  {
    loading: () => (
      <div className="text-sm text-muted-foreground">Loading Daily English…</div>
    ),
  }
);

export const metadata: Metadata = { title: "Daily English" };

export default function EnglishPage() {
  return (
    <PageShell
      title="Daily English"
      description="English Boost — 10 words a day with AI, flashcards and spaced repetition"
      icon={<Languages className="size-5" />}
    >
      <EnglishWorkspace />
    </PageShell>
  );
}
