"use client";

import * as React from "react";
import { Download, FileJson, FileText, Copy, Check, Upload } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCareerStore } from "@/stores/careerStore";
import { useMemoryStore } from "@/stores/memoryStore";
import {
  buildExport,
  buildJournalMarkdown,
  exportFilename,
} from "@/lib/exportData";
import {
  mergeDiaryImport,
  parseImportFile,
  summarizeImport,
} from "@/lib/importData";
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

function applyMergedImport(merged: ReturnType<typeof mergeDiaryImport>) {
  useScheduleStore.setState({
    events: merged.events,
    habits: merged.habits,
  });
  useProgressStore.setState({
    logs: merged.logs,
    tracks: merged.tracks,
    reports: merged.reports,
    goal: merged.goal,
  });
  useCareerStore.setState({ applications: merged.applications });
  useMemoryStore.setState({
    goals: merged.memory.goals,
    values: merged.memory.values,
    constraints: merged.memory.constraints,
    preferences: merged.memory.preferences,
    learningPace: merged.memory.learningPace,
    notes: merged.memory.notes,
  });
}

export function ExportDataCard() {
  const logCount = useProgressStore((s) => s.logs.length);
  const doneCount = useScheduleStore(
    (s) => s.events.filter((e) => e.status === "done").length
  );
  const habitCount = useScheduleStore((s) => s.habits.length);
  const [copied, setCopied] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importMsg, setImportMsg] = React.useState<string | null>(null);
  const [importErr, setImportErr] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

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

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportErr(null);
    setImportMsg(null);
    try {
      const raw = await file.text();
      const incoming = parseImportFile(raw);
      const local = {
        events: useScheduleStore.getState().events,
        habits: useScheduleStore.getState().habits,
        logs: useProgressStore.getState().logs,
        tracks: useProgressStore.getState().tracks,
        reports: useProgressStore.getState().reports,
        weeklyReports: useProgressStore.getState().weeklyReports,
        goal: useProgressStore.getState().goal,
        memory: useMemoryStore.getState().snapshot(),
        applications: useCareerStore.getState().applications,
      };
      const merged = mergeDiaryImport(local, incoming);
      applyMergedImport(merged);
      const summary = summarizeImport(merged, incoming);
      setImportMsg(
        `Imported ${summary.events} events and ${summary.logs} logs from file. Today (${summary.today}): ${summary.todayEvents} events, ${summary.todayLogs} diary entries. Next: Sync Up.`
      );
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm">Export / Import data</CardTitle>
          <p className="text-xs text-muted-foreground">
            Download a backup, or restore from a Full JSON export file.
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
          <Button
            size="sm"
            variant="default"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {importing ? "Importing…" : "Import JSON"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportFile(e.target.files?.[0])}
          />
        </div>
        {importMsg ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">{importMsg}</p>
        ) : null}
        {importErr ? (
          <p className="text-xs text-destructive">{importErr}</p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          Markdown is best for ChatGPT / Claude. JSON keeps every field. Import merges by id
          (file wins when newer) — English Boost is not changed.
        </p>
      </CardContent>
    </Card>
  );
}
