import type { Metadata } from "next";
import { ChefHat } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CookingWorkspace } from "@/components/cooking/CookingWorkspace";

export const metadata: Metadata = { title: "Cooking" };

export default function CookingPage() {
  return (
    <PageShell
      title="Cooking"
      description="Fridge and AI recipes"
      icon={<ChefHat className="size-5" />}
    >
      <CookingWorkspace />
    </PageShell>
  );
}
