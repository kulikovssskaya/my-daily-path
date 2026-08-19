#!/usr/bin/env node
/** Build DevTools paste snippet from .data/sync-state.json */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const statePath = path.join(root, ".data", "sync-state.json");
const outPath = path.join(root, "scripts", "browser-restore-snippet.js");

if (!fs.existsSync(statePath)) {
  console.error("Missing .data/sync-state.json — run export-to-sync-state.mjs first.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(statePath, "utf8"));
const blobs = payload.blobs ?? {};
const keys = ["mdp-schedule", "mdp-progress", "mdp-memory"];

for (const key of keys) {
  if (typeof blobs[key] !== "string" || !blobs[key]) {
    console.error("Missing blob:", key);
    process.exit(1);
  }
}

function countsFromBlob(key, raw) {
  try {
    const w = JSON.parse(raw);
    const st = w.state ?? w;
    if (key === "mdp-schedule") {
      const events = st.events ?? [];
      const day = events.filter((e) => String(e.start).startsWith("2026-07-24"));
      return { events: events.length, eventsToday: day.length };
    }
    if (key === "mdp-progress") {
      const logs = st.logs ?? st.dailyLogs ?? [];
      const day = logs.filter((l) => String(l.date).startsWith("2026-07-24"));
      return { logs: logs.length, logsToday: day.length };
    }
    return {};
  } catch {
    return {};
  }
}

const scheduleCounts = countsFromBlob("mdp-schedule", blobs["mdp-schedule"]);
const progressCounts = countsFromBlob("mdp-progress", blobs["mdp-progress"]);

const lines = [
  "(() => {",
  "  const blobs = " + JSON.stringify({
    "mdp-schedule": blobs["mdp-schedule"],
    "mdp-progress": blobs["mdp-progress"],
    "mdp-memory": blobs["mdp-memory"],
  }) + ";",
  "  const skipEnglish = localStorage.getItem('mdp-english');",
  "  for (const [key, val] of Object.entries(blobs)) {",
  "    localStorage.setItem(key, val);",
  "  }",
  "  const sch = JSON.parse(blobs['mdp-schedule']);",
  "  const prog = JSON.parse(blobs['mdp-progress']);",
  "  const ev = (sch.state?.events ?? []).length;",
  "  const logs = (prog.state?.logs ?? []).length;",
  "  const englishNote = skipEnglish ? ' (mdp-english left unchanged)' : '';",
  `  alert('Restored: ' + ev + ' events, ' + logs + ' diary logs, memory updated.' + englishNote + '\\n\\nReload the page.');`,
  "})();",
  "",
];

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("Wrote", outPath);
console.log("Schedule:", scheduleCounts);
console.log("Progress:", progressCounts);
