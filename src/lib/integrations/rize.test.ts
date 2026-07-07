import { describe, expect, it } from "vitest";
import {
  applyStudyHeuristic,
  buildTitleDetailsFromEvents,
  buildRizeEventTitle,
  buildTitleBreakdownFromApps,
  buildTitleBreakdownFromEvents,
  buildTitleBreakdownFromEventsAndApps,
  filterEntriesInWindow,
  formatTitleBreakdown,
  mapRizeEntryToCalendarEvent,
  normalizeRizeSeconds,
  parseTitleBreakdownFromRaw,
  rizeCategoryFromProject,
  rizeTrackFromProject,
  rizeIsoToNaive,
  formatRizeTitleDetailsNotes,
  isSyntheticRizeEntryId,
  isTimelineRizeEntry,
  isRizeAiNarrative,
  looksLikeOrphanRizeCalendarEvent,
  rawRizeEntryHasTrackingProof,
  uncoveredFraction,
  type RizeTimeEntry,
} from "@/lib/integrations/rize";

const baseEntry: RizeTimeEntry = {
  id: "project_123",
  description: "Reading docs",
  duration: 3600,
  startTime: "2026-07-02T10:00:00.000Z",
  endTime: "2026-07-02T11:00:00.000Z",
  source: "project",
  projectName: "English",
  clientName: null,
  entryTitle: "Reading docs",
  kind: "project",
};

describe("rize integration", () => {
  it("maps learning from title breakdown and project tag", () => {
    expect(rizeCategoryFromProject("English", null)).toBe("learning");
    expect(
      rizeCategoryFromProject("Training", "Developed Cursor Agents Code and Research")
    ).toBe("learning");
    expect(
      rizeCategoryFromProject("JOB", null, [{ label: "Study", percent: 75 }])
    ).toBe("learning");
    expect(rizeTrackFromProject("English")).toBe("english");
  });

  it("formats title breakdown as study 75% + telegram 18%", () => {
    expect(
      formatTitleBreakdown([
        { label: "Study", percent: 75 },
        { label: "Telegram", percent: 18 },
      ])
    ).toBe("study 75% + telegram 18%");
  });

  it("maps chrome to study when entry summary mentions studying", () => {
    expect(
      formatTitleBreakdown(
        applyStudyHeuristic(
          [
            { label: "Google Chrome", percent: 75 },
            { label: "Telegram", percent: 18 },
          ],
          "Studied AI Agent Implementation in Cursor"
        )
      )
    ).toBe("study 75% + telegram 18%");
  });

  it("matches Rize 11:12 block (study 83% + cursor agents 15%)", () => {
    const start = "2026-07-03T04:12:02.000Z";
    const t = (offsetSec: number) =>
      new Date(new Date(start).getTime() + offsetSec * 1000).toISOString();

    const breakdown = buildTitleBreakdownFromEventsAndApps(
      [
        { appName: "Google Chrome", title: "Study", startTime: start, endTime: t(819) },
        { appName: "Cursor", title: "Cursor Agents", startTime: t(819), endTime: t(969) },
      ],
      [
        { appName: "Google Chrome", title: "Google Chrome", timeSpent: 819 },
        { appName: "Cursor", title: "Cursor", timeSpent: 166 },
      ],
      969
    );

    expect(formatTitleBreakdown(breakdown)).toBe("study 83% + cursor agents 15%");
  });

  it("study-heavy block uses apps total as denominator", () => {
    const start = "2026-07-03T04:34:00.000Z";
    const t = (offsetSec: number) =>
      new Date(new Date(start).getTime() + offsetSec * 1000).toISOString();

    const breakdown = buildTitleBreakdownFromEventsAndApps(
      [
        { appName: "Google Chrome", title: "Study", startTime: start, endTime: t(608) },
        {
          appName: "Telegram Desktop",
          title: "Vladimir – (1)",
          startTime: t(608),
          endTime: t(653),
        },
      ],
      [
        { appName: "Google Chrome", title: "Google Chrome", timeSpent: 720 },
        { appName: "Telegram Desktop", title: "Telegram Desktop", timeSpent: 45 },
      ],
      780
    );

    expect(Math.round(breakdown.find((s) => /study/i.test(s.label))?.percent ?? 0)).toBe(79);
    expect(breakdown.some((s) => /telegram/i.test(s.label))).toBe(false);
  });

  it("includes cursor and other titles above 5%", () => {
    const start = "2026-07-03T05:52:00.000Z";
    const t = (offsetSec: number) =>
      new Date(new Date(start).getTime() + offsetSec * 1000).toISOString();

    const breakdown = buildTitleBreakdownFromEventsAndApps(
      [
        { appName: "Google Chrome", title: "Study", startTime: start, endTime: t(700) },
        { appName: "Cursor", title: "Cursor Agents", startTime: t(700), endTime: t(760) },
        { appName: "Telegram Desktop", title: "Telegram", startTime: t(760), endTime: t(820) },
      ],
      [
        { appName: "Google Chrome", title: "Google Chrome", timeSpent: 700 },
        { appName: "Cursor", title: "Cursor", timeSpent: 60 },
        { appName: "Telegram Desktop", title: "Telegram Desktop", timeSpent: 60 },
      ],
      820
    );

    expect(breakdown.some((s) => /cursor agents/i.test(s.label))).toBe(true);
    expect(breakdown.some((s) => /telegram/i.test(s.label))).toBe(true);
    expect(breakdown.some((s) => /study/i.test(s.label))).toBe(true);
  });

  it("matches Rize 20:26 block (Study 42% from events + apps pool)", () => {
    const start = "2026-07-03T13:26:35.000Z";
    const t = (offsetSec: number) =>
      new Date(new Date(start).getTime() + offsetSec * 1000).toISOString();

    const breakdown = buildTitleBreakdownFromEventsAndApps(
      [
        { appName: "Google Chrome", title: "Study", startTime: start, endTime: t(17) },
        { appName: "Telegram Desktop", title: "Telegram", startTime: t(17), endTime: t(32) },
        {
          appName: "Telegram Desktop",
          title: "Flex – (122734)",
          startTime: t(32),
          endTime: t(47),
        },
        {
          appName: "Telegram Desktop",
          title: "Telegram (122734)",
          startTime: t(47),
          endTime: t(62),
        },
        {
          appName: "Telegram Desktop",
          title: "Beliy Chelovek – (122734)",
          startTime: t(62),
          endTime: t(77),
        },
        { appName: "Google Chrome", title: "Study", startTime: t(77), endTime: t(280) },
        { appName: "Google Chrome", title: "Study", startTime: t(280), endTime: t(311) },
        {
          appName: "Telegram Desktop",
          title: "Telegram (122748)",
          startTime: t(311),
          endTime: t(326),
        },
        {
          appName: "Telegram Desktop",
          title: "Telegram (122757)",
          startTime: t(326),
          endTime: t(446),
        },
        {
          appName: "Telegram Desktop",
          title: "Telegram (122803)",
          startTime: t(446),
          endTime: t(461),
        },
        {
          appName: "Telegram Desktop",
          title: "Get Rejected – (122802)",
          startTime: t(461),
          endTime: t(476),
        },
        {
          appName: "Telegram Desktop",
          title: "Telegram (122802)",
          startTime: t(476),
          endTime: t(491),
        },
        {
          appName: "Telegram Desktop",
          title: "TelegramDesktop",
          startTime: t(491),
          endTime: t(506),
        },
        {
          appName: "Telegram Desktop",
          title: "Vladimir – (122811)",
          startTime: t(506),
          endTime: t(566),
        },
        {
          appName: "Telegram Desktop",
          title: "Vladimir – (122812)",
          startTime: t(566),
          endTime: t(596),
        },
        {
          appName: "Telegram Desktop",
          title: "Vladimir – (122813)",
          startTime: t(596),
          endTime: t(611),
        },
        {
          appName: "Telegram Desktop",
          title: "Vladimir – (122814)",
          startTime: t(611),
          endTime: t(642),
        },
        {
          appName: "Telegram Desktop",
          title: "Telegram (122815)",
          startTime: t(642),
          endTime: t(747),
        },
        { appName: "Google Chrome", title: "Study", startTime: t(747), endTime: t(771) },
      ],
      [
        { appName: "Google Chrome", title: "Google Chrome", timeSpent: 251 },
        { appName: "Telegram Desktop", title: "Telegram Desktop", timeSpent: 494 },
      ],
      771
    );

    expect(Math.round(breakdown.find((s) => /study/i.test(s.label))?.percent ?? 0)).toBe(42);
    expect(Math.round(breakdown.find((s) => /telegram/i.test(s.label))?.percent ?? 0)).toBe(18);
  });

  it("apps-only understates study when chrome lacks tab title (34%)", () => {
    const breakdown = buildTitleBreakdownFromApps(
      [
        { appName: "Google Chrome", title: "Google Chrome", timeSpent: 251 },
        { appName: "Telegram Desktop", title: "Telegram Desktop", timeSpent: 494 },
      ],
      771
    );
    expect(Math.round(breakdown.find((s) => /chrome/i.test(s.label))?.percent ?? 0)).toBe(34);
  });

  it("matches Rize percent base (tracked time, not wall clock)", () => {
    const breakdown = buildTitleBreakdownFromApps(
      [
        { appName: "Google Chrome", title: "Study", timeSpent: 280 },
        { appName: "Telegram Desktop", timeSpent: 120 },
        { appName: "Cursor", timeSpent: 45 },
        { appName: "Search Host", timeSpent: 222 },
      ],
      13 * 60
    );
    expect(formatTitleBreakdown(breakdown)).toBe("study 42% + telegram 18% + cursor 7%");
  });

  it("events-only wall-clock span gives 36% study without apps pool", () => {
    const start = "2026-07-03T13:26:00.000Z";
    const t = (offsetSec: number) =>
      new Date(new Date(start).getTime() + offsetSec * 1000).toISOString();

    const eventsBreakdown = buildTitleBreakdownFromEvents(
      [
        { appName: "Google Chrome", title: "Study", startTime: start, endTime: t(280) },
        {
          appName: "Telegram Desktop",
          title: "Telegram",
          startTime: t(280),
          endTime: t(400),
        },
        {
          appName: "Search Host",
          title: "Search Host",
          startTime: t(400),
          endTime: t(780),
        },
      ],
      13 * 60
    );

    expect(Math.round(eventsBreakdown.find((s) => /study/i.test(s.label))?.percent ?? 0)).toBe(
      36
    );
  });

  it("drops short telegram noise (background app under 2 min)", () => {
    const breakdown = buildTitleBreakdownFromApps(
      [
        { appName: "Google Chrome", title: "Study", timeSpent: 600 },
        { appName: "Cursor", timeSpent: 1800 },
        { appName: "Telegram Desktop", timeSpent: 45 },
      ],
      42 * 60
    );
    expect(breakdown.some((b) => /telegram/i.test(b.label))).toBe(false);
  });

  it("builds breakdown from appsAndWebsites window", () => {
    const breakdown = buildTitleBreakdownFromApps(
      [
        { appName: "Google Chrome", title: "Study — Analyst", timeSpent: 240 },
        { appName: "Telegram", title: "Telegram", timeSpent: 120 },
        { appName: "Cursor", title: "Cursor", timeSpent: 30 },
      ],
      390
    );
    expect(formatTitleBreakdown(breakdown)).toBe("study 62% + telegram 31% + cursor 8%");
  });

  it("builds breakdown with 5% floor and merges telegram chats", () => {
    const breakdown = parseTitleBreakdownFromRaw(
      {
        titles: [
          { title: "Study", timeSpent: 4, percentage: 75 },
          { title: "Telegram (122757)", timeSpent: 2, percentage: 18 },
          { title: "Noise", timeSpent: 1, percentage: 3 },
        ],
      },
      13 * 60
    );
    expect(breakdown.map((b) => b.label)).toEqual(["Study", "Telegram"]);
    expect(formatTitleBreakdown(breakdown)).toBe("study 75% + telegram 18%");
  });

  it("prefers Rize timeline summary over titles tab shares", () => {
    expect(
      buildRizeEventTitle({
        ...baseEntry,
        kind: "time",
        projectName: "Training",
        entryTitle: "Developed Cursor Agents Code and Researched AI topics",
        titleBreakdown: [
          { label: "Study", percent: 75 },
          { label: "Telegram", percent: 18 },
        ],
      })
    ).toBe("Developed Cursor Agents Code and Researched AI topics");
  });

  it("falls back to project tag when narrative is missing", () => {
    expect(
      buildRizeEventTitle({
        ...baseEntry,
        kind: "time",
        projectName: "Training",
        entryTitle: null,
        titleBreakdown: undefined,
      })
    ).toBe("Training");
  });

  it("maps entry to calendar event", () => {
    const ev = mapRizeEntryToCalendarEvent(baseEntry);
    expect(ev).not.toBeNull();
    expect(ev?.category).toBe("learning");
  });

  it("uses Rize narrative as title and title details in notes", () => {
    const ev = mapRizeEntryToCalendarEvent({
      ...baseEntry,
      kind: "time",
      projectName: "Training",
      entryTitle:
        "Progressed through several lessons of the Generation Python beginner course",
      titleDetails: [
        {
          label: '"Поколение Python": курс для начинающих: урок Поиск ошибок…',
          seconds: 180,
          percent: 16,
        },
        {
          label: '"Поколение Python": курс для начинающих: урок break, continue…',
          seconds: 60,
          percent: 8,
        },
      ],
    });
    expect(ev?.title).toContain("Generation Python");
    expect(ev?.notes).toContain("Tag: Training");
    expect(ev?.notes).toContain("Titles:");
    expect(ev?.notes).toContain("Поколение Python");
    expect(ev?.notes).toContain("3 min (16%)");
    expect(ev?.category).toBe("learning");
  });

  it("keeps Training as learning even when summary mentions code", () => {
    expect(
      rizeCategoryFromProject(
        "Training",
        "Progressed through lessons focusing on code review techniques",
        [{ label: "Study", percent: 80 }]
      )
    ).toBe("learning");
  });

  it("builds title details from raw window titles", () => {
    const start = "2026-07-05T14:37:00";
    const t = (offsetSec: number) =>
      new Date(new Date(start).getTime() + offsetSec * 1000).toISOString();

    const details = buildTitleDetailsFromEvents(
      [
        {
          appName: "Google Chrome",
          title: '"Поколение Python": курс для начинающих: урок Поиск ошибок…',
          startTime: start,
          endTime: t(180),
        },
        {
          appName: "Google Chrome",
          title: '"Поколение Python": курс для начинающих: урок break, continue…',
          startTime: t(180),
          endTime: t(240),
        },
      ],
      240
    );

    expect(details[0]?.label).toContain("Поколение Python");
    expect(details[0]?.seconds).toBe(180);
  });

  it("skips very short entries", () => {
    const ev = mapRizeEntryToCalendarEvent({
      ...baseEntry,
      duration: 30,
      startTime: "2026-07-02T10:00:00.000Z",
      endTime: "2026-07-02T10:00:20.000Z",
    });
    expect(ev).toBeNull();
  });

  it("normalizes minutes to seconds for app usage", () => {
    expect(normalizeRizeSeconds(45, [30, 120, 45])).toBe(45 * 60);
  });

  it("filters entries by sync window", () => {
    const filtered = filterEntriesInWindow(
      [
        baseEntry,
        {
          ...baseEntry,
          id: "project_456",
          startTime: "2026-06-01T10:00:00.000Z",
          endTime: "2026-06-01T11:00:00.000Z",
        },
      ],
      {
        start: new Date("2026-07-01T00:00:00.000Z"),
        end: new Date("2026-07-03T00:00:00.000Z"),
      }
    );
    expect(filtered).toHaveLength(1);
  });

  it("detects uncovered calendar gaps for summary fill", () => {
    const hourStart = Date.parse("2026-07-05T13:00:00.000Z");
    const hourEnd = Date.parse("2026-07-05T14:00:00.000Z");
    const noonBlock = {
      start: Date.parse("2026-07-05T12:19:00.000Z"),
      end: Date.parse("2026-07-05T12:39:00.000Z"),
    };

    expect(uncoveredFraction(hourStart, hourEnd, [noonBlock])).toBe(1);
    expect(uncoveredFraction(hourStart, hourEnd, [])).toBe(1);

    const mostlyCovered = {
      start: hourStart,
      end: hourStart + 55 * 60 * 1000,
    };
    expect(uncoveredFraction(hourStart, hourEnd, [mostlyCovered])).toBeLessThan(0.1);
  });

  it("flags synthetic rize ids", () => {
    expect(isSyntheticRizeEntryId("summary_2026-07-05T13:00:00Z")).toBe(true);
    expect(isSyntheticRizeEntryId("app_day_0_chrome")).toBe(true);
    expect(isSyntheticRizeEntryId("time_abc123")).toBe(false);

    expect(
      isTimelineRizeEntry({
        ...baseEntry,
        id: "time_1",
        kind: "time",
      })
    ).toBe(true);
  });

  it("detects orphan Rize calendar imports without rizeEntryId", () => {
    expect(
      isRizeAiNarrative("Completed Python Debugging and Code Review Lessons")
    ).toBe(true);

    expect(
      looksLikeOrphanRizeCalendarEvent({
        title: "Completed Python Debugging and Code Review Lessons",
        status: "done",
        notes: "Tag: Training\nTitles:\n• Study — 45 min (80%)",
      })
    ).toBe(true);

    expect(
      looksLikeOrphanRizeCalendarEvent({
        title: "google chrome 66%",
        status: "done",
      })
    ).toBe(true);

    expect(
      looksLikeOrphanRizeCalendarEvent({
        title: "Completed Python Debugging and Code Review Lessons",
        status: "done",
        meta: { rizeEntryId: "time_abc" },
      })
    ).toBe(false);

    expect(
      looksLikeOrphanRizeCalendarEvent({
        title: "Morning standup",
        status: "done",
      })
    ).toBe(false);
  });

  it("converts Rize UTC timestamps to user timezone", () => {
    expect(
      rizeIsoToNaive("2026-07-06T00:37:00.000Z", "Asia/Bangkok")
    ).toBe("2026-07-06T07:37:00");
  });

  it("requires tracking proof before importing a Rize time entry", () => {
    expect(
      rawRizeEntryHasTrackingProof({
        startTime: "2026-07-05T00:37:00.000Z",
        endTime: "2026-07-05T01:00:00.000Z",
        title: "Completed Python Debugging and Code Review Lessons",
      })
    ).toBe(false);

    expect(
      rawRizeEntryHasTrackingProof({
        _trackingProof: true,
        title: "Completed Python Debugging and Code Review Lessons",
      })
    ).toBe(true);

    expect(
      rawRizeEntryHasTrackingProof({
        titles: [{ title: "Study", timeSpent: 1200 }],
      })
    ).toBe(true);
  });
});
