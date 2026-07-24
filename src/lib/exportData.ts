import type {
  ScheduleEvent,
  Habit,
  DailyLog,
  LearningTrack,
  DailyReport,
  UserMemory,
  JobApplication,
} from "@/types";
import { computeTrackStats } from "@/lib/progress";

export const EXPORT_VERSION = "1.0";

export interface MyDailyPathExport {
  meta: {
    app: "My Daily Path";
    version: typeof EXPORT_VERSION;
    exportedAt: string;
    hint: string;
  };
  schedule: {
    events: ScheduleEvent[];
    habits: Habit[];
    doneEvents: ScheduleEvent[];
  };
  progress: {
    dailyLogs: DailyLog[];
    tracks: LearningTrack[];
    reports: DailyReport[];
    goal: { title: string; targetHours: number };
  };
  memory: UserMemory;
  career: {
    applications: JobApplication[];
  };
}

export interface ExportInput {
  events: ScheduleEvent[];
  habits: Habit[];
  logs: DailyLog[];
  tracks: LearningTrack[];
  reports: DailyReport[];
  goal: { title: string; targetHours: number };
  memory: UserMemory;
  applications: JobApplication[];
}

export function buildExport(input: ExportInput): MyDailyPathExport {
  const doneEvents = input.events
    .filter((e) => e.status === "done")
    .sort((a, b) => a.start.localeCompare(b.start));

  return {
    meta: {
      app: "My Daily Path",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      hint: "Full diary + schedule export for AI analysis. dailyLogs = free-form notes; doneEvents = completed calendar blocks.",
    },
    schedule: {
      events: [...input.events].sort((a, b) => a.start.localeCompare(b.start)),
      habits: input.habits,
      doneEvents,
    },
    progress: {
      dailyLogs: [...input.logs].sort((a, b) => b.date.localeCompare(a.date)),
      tracks: input.tracks,
      reports: input.reports,
      goal: input.goal,
    },
    memory: input.memory,
    career: { applications: input.applications },
  };
}

function parseLocalIso(iso: string): Date {
  const [date, time] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function eventDurationMin(ev: ScheduleEvent): number {
  const start = parseLocalIso(ev.start);
  const end = parseLocalIso(ev.end);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function timeRange(iso: string) {
  return iso.slice(11, 16);
}

/** Markdown journal grouped by day — optimized for pasting into advanced AI. */
export function buildJournalMarkdown(data: MyDailyPathExport): string {
  const lines: string[] = [
    "# My Daily Path — Personal Journal Export",
    "",
    `Exported: ${data.meta.exportedAt}`,
    `Goal: ${data.progress.goal.title} (target ${data.progress.goal.targetHours}h)`,
    "",
  ];

  if (data.memory.goals.length) {
    lines.push("## Long-term goals", ...data.memory.goals.map((g) => `- ${g}`), "");
  }
  if (data.memory.notes.length) {
    lines.push("## AI memory notes", ...data.memory.notes.map((n) => `- ${n.text}`), "");
  }

  const dayMap = new Map<string, { logs: DailyLog[]; events: ScheduleEvent[] }>();

  for (const log of data.progress.dailyLogs) {
    const d = log.date.slice(0, 10);
    if (!dayMap.has(d)) dayMap.set(d, { logs: [], events: [] });
    dayMap.get(d)!.logs.push(log);
  }
  for (const ev of data.schedule.doneEvents) {
    const d = ev.start.slice(0, 10);
    if (!dayMap.has(d)) dayMap.set(d, { logs: [], events: [] });
    dayMap.get(d)!.events.push(ev);
  }

  const days = [...dayMap.keys()].sort((a, b) => b.localeCompare(a));

  lines.push("## Daily journal", "");

  if (days.length === 0) {
    lines.push("_No diary entries or completed tasks yet._", "");
  }

  for (const day of days) {
    const { logs, events } = dayMap.get(day)!;
    lines.push(`### ${day}`, "");

    if (logs.length) {
      lines.push("**Diary notes:**");
      for (const l of logs.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        lines.push(`- ${l.text}`);
      }
      lines.push("");
    }

    if (events.length) {
      lines.push("**Completed schedule:**");
      for (const ev of events.sort((a, b) => a.start.localeCompare(b.start))) {
        const track = ev.meta?.track ? ` · track: ${ev.meta.track}` : "";
        const notes = ev.notes ? ` — ${ev.notes}` : "";
        lines.push(
          `- ${timeRange(ev.start)}–${timeRange(ev.end)} (${eventDurationMin(ev)} min) · **${ev.title}** [${ev.category}]${track}${notes}`
        );
      }
      lines.push("");
    }
  }

  if (data.schedule.habits.length) {
    lines.push("## Recurring habits", "");
    for (const h of data.schedule.habits) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const wd = h.weekdays.map((d) => days[d]).join(", ");
      lines.push(`- ${h.title}: ${wd} at ${h.time}, ${h.duration} min [${h.category}]`);
    }
    lines.push("");
  }

  if (data.progress.tracks.length) {
    lines.push("## Learning tracks", "");
    for (const t of data.progress.tracks) {
      const stats = computeTrackStats(data.schedule.events, t);
      lines.push(
        `- ${t.name} (${t.type}): ${stats.loggedHours.toFixed(1)}h logged${t.targetHours ? ` / ${t.targetHours}h target` : ""}, streak ${stats.streak}d`
      );
    }
    lines.push("");
  }

  if (data.progress.reports.length) {
    lines.push("## AI progress reports", "");
    for (const r of data.progress.reports.slice(0, 10)) {
      lines.push(`### ${r.date.slice(0, 10)}`, r.summary, "");
      if (r.recommendations.length) {
        lines.push("Recommendations:", ...r.recommendations.map((rec) => `- ${rec}`), "");
      }
    }
  }

  return lines.join("\n");
}

export function exportFilename(ext: "json" | "md"): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `my-daily-path-export-${stamp}.${ext}`;
}
