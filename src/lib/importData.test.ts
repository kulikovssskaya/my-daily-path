import { describe, expect, it } from "vitest";
import {
  mergeByIdPreferIncoming,
  mergeDiaryImport,
  parseImportFile,
} from "@/lib/importData";
import type { MyDailyPathExport } from "@/lib/exportData";

const sampleExport: MyDailyPathExport = {
  meta: {
    app: "My Daily Path",
    version: "1.0",
    exportedAt: "2026-07-24T11:26:39.234Z",
    hint: "test",
  },
  schedule: {
    events: [
      {
        id: "ev_today",
        title: "Python",
        category: "learning",
        start: "2026-07-24T13:20:00",
        end: "2026-07-24T13:42:00",
        status: "done",
        priority: 3,
        lastModifiedAt: "2026-07-24T06:42:50.839Z",
      },
    ],
    habits: [],
    doneEvents: [],
  },
  progress: {
    dailyLogs: [
      {
        id: "log_today",
        date: "2026-07-24",
        text: "Timer: Python",
        createdAt: "2026-07-24T06:42:43.220Z",
        lastModifiedAt: "2026-07-24T06:42:43.220Z",
      },
    ],
    tracks: [],
    reports: [],
    goal: { title: "ML", targetHours: 200 },
  },
  memory: {
    goals: ["ML"],
    values: [],
    constraints: [],
    learningPace: {},
    preferences: [],
    notes: [],
  },
  career: { applications: [] },
};

describe("parseImportFile", () => {
  it("accepts diary export", () => {
    const parsed = parseImportFile(JSON.stringify(sampleExport));
    expect(parsed.schedule.events).toHaveLength(1);
    expect(parsed.progress.dailyLogs[0]?.id).toBe("log_today");
  });

  it("accepts sync-state blobs", () => {
    const blobs = {
      "mdp-schedule": JSON.stringify({
        state: { events: sampleExport.schedule.events, habits: [] },
        version: 0,
      }),
      "mdp-progress": JSON.stringify({
        state: {
          logs: sampleExport.progress.dailyLogs,
          tracks: [],
          reports: [],
          weeklyReports: [],
          goal: sampleExport.progress.goal,
        },
        version: 2,
      }),
    };
    const parsed = parseImportFile(JSON.stringify({ blobs }));
    expect(parsed.schedule.events[0]?.title).toBe("Python");
  });
});

describe("mergeByIdPreferIncoming", () => {
  it("keeps newer incoming", () => {
    const local = [
      {
        id: "a",
        lastModifiedAt: "2026-07-24T01:00:00.000Z",
        title: "old",
      },
    ];
    const incoming = [
      {
        id: "a",
        lastModifiedAt: "2026-07-24T08:00:00.000Z",
        title: "new",
      },
    ];
    expect(mergeByIdPreferIncoming(local, incoming)[0]?.title).toBe("new");
  });
});

describe("mergeDiaryImport", () => {
  it("adds missing today event from export", () => {
    const merged = mergeDiaryImport(
      {
        events: [],
        habits: [],
        logs: [],
        tracks: [],
        reports: [],
        goal: { title: "", targetHours: 0 },
        memory: {
          goals: [],
          values: [],
          constraints: [],
          learningPace: {},
          preferences: [],
          notes: [],
        },
        applications: [],
      },
      sampleExport
    );
    expect(merged.events).toHaveLength(1);
    expect(merged.logs).toHaveLength(1);
    expect(merged.goal.title).toBe("ML");
  });
});
