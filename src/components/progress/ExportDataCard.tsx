"use client";

import * as React from "react";
import { Download, FileJson, FileText, Copy, Check } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCareerStore } from "@/stores/careerStore";
import { useMemoryStore } from "@/stores/memoryStore";
import {
  buildExport,
  buildJournalMarkdown,
  exportFilename,
} from "@/lib/exportData";
import { downloadTextFile } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function gatherExport() {
  const { events, habits } = useScheduleStore.getState();
  const { logs, tracks, reports, goal } = useProgressStore.getState();
  const { applications } = useCareerStore.getState();
  const memory = useMemoryStore.getState().snapshot();

  return buildExport({
    events,
    habits,
    logs,
    tracks,
    reports,
    goal,
    memory,
    applications,
  });
}

export function ExportDataCard() {
  const logCount = useProgressStore((s) => s.logs.length);
  const doneCount = useScheduleStore(
    (s) => s.events.filter((e) => e.status === "done").length
  );
  const habitCount = useScheduleStore((s) => s.habits.length);
  const [copied, setCopied] = React.useState(false);

  const downloadJson = () => {
    downloadTextFile(
      exportFilename("json"),
      JSON.stringify(gatherExport(), null, 2),
      "application/json"
    );
  };

  const downloadMarkdown = () => {
    downloadTextFile(
      exportFilename("md"),
      buildJournalMarkdown(gatherExport()),
      "text/markdown"
    );
  };

  const copyJournal = async () => {
    await navigator.clipboard.writeText(buildJournalMarkdown(gatherExport()));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm">Export data</CardTitle>
          <p className="text-xs text-muted-foreground">
            Download completed calendar sessions, habits, and notes as one file.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {logCount} diary entries · {doneCount} completed events · {habitCount} habits
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={downloadMarkdown}>
            <FileText className="size-4" />
            Markdown journal
          </Button>
          <Button size="sm" variant="outline" onClick={downloadJson}>
            <FileJson className="size-4" />
            Full JSON
          </Button>
          <Button size="sm" variant="ghost" onClick={copyJournal}>
            {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy journal"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Markdown is best for ChatGPT / Claude. JSON keeps every field for scripts or fine-tuning.
        </p>
      </CardContent>
    </Card>
  );
}
