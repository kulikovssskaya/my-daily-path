"use client";

import { Undo2 } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { Button } from "@/components/ui/button";
import { NaturalInput } from "./NaturalInput";
import { Agenda } from "./Agenda";
import { HabitsManager } from "./HabitsManager";
import { DataProtectionBanner } from "./DataProtectionBanner";
import {
  EveningWrapCard,
  EveningWrapNudge,
} from "@/components/progress/EveningWrapCard";

export function ScheduleWorkspace() {
  const undo = useScheduleStore((s) => s.undo);
  const canUndo = useScheduleStore((s) => s.past.length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
          <Undo2 className="size-4" />
          Undo last change
        </Button>
      </div>
      <DataProtectionBanner />
      <EveningWrapNudge />
      <NaturalInput />
      <Agenda />
      <div id="evening-wrap">
        <EveningWrapCard compact />
      </div>
      <HabitsManager />
    </div>
  );
}
