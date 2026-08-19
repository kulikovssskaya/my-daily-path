#!/usr/bin/env node
/** Convert MyDailyPath export JSON into .data/sync-state.json for cloud upload. */
import fs from "node:fs";
import path from "node:path";

const DEFAULT_EXPORT =
  "C:\\Users\\User\\Downloads\\my-daily-path-export-2026-07-24 (1).json";

const exportPath = path.resolve(process.argv[2] ?? DEFAULT_EXPORT);
const outPath = path.join(process.cwd(), ".data", "sync-state.json");

function countOnDay(items, day, field) {
  return items.filter((item) => String(item[field] ?? "").startsWith(day)).length;
}

if (!fs.existsSync(exportPath)) {
  console.error("Export file not found:", exportPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(exportPath, "utf8"));

const { schedule, progress, memory, career, meta } = data;
if (!schedule || !progress || !memory || !meta?.exportedAt) {
  console.error("Invalid MyDailyPath export format.");
  process.exit(1);
}

const blobs = {
  "mdp-schedule": JSON.stringify({
    state: { events: schedule.events ?? [], habits: schedule.habits ?? [] },
    version: 0,
  }),
  "mdp-progress": JSON.stringify({
    state: {
      tracks: progress.tracks ?? [],
      reports: progress.reports ?? [],
      weeklyReports: [],
      logs: progress.dailyLogs ?? [],
      goal: progress.goal ?? { title: "", targetHours: 0 },
    },
    version: 2,
  }),
  "mdp-memory": JSON.stringify({
    state: memory,
    version: 0,
  }),
};

const applications = career?.applications ?? [];
if (applications.length > 0) {
  blobs["mdp-career"] = JSON.stringify({
    state: {
      applications,
      cvs: [],
      postings: [],
      posts: [],
      linkedInConnected: false,
    },
    version: 0,
  });
}

const payload = {
  updatedAt: meta.exportedAt,
  blobs,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");

const day = "2026-07-24";
const events = schedule.events ?? [];
const logs = progress.dailyLogs ?? [];

console.log("Wrote", outPath);
console.log("updatedAt:", payload.updatedAt);
console.log("Store keys:", Object.keys(blobs).join(", "));
console.log("Counts:");
console.log("  events (total):", events.length);
console.log("  events on", day + ":", countOnDay(events, day, "start"));
console.log("  dailyLogs (total):", logs.length);
console.log("  dailyLogs on", day + ":", countOnDay(logs, day, "date"));
console.log("  habits:", (schedule.habits ?? []).length);
console.log("  tracks:", (progress.tracks ?? []).length);
console.log("  reports:", (progress.reports ?? []).length);
console.log("  applications:", applications.length);
