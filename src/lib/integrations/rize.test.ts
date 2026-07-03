import { describe, expect, it } from "vitest";
import {
  buildRizeEventTitle,
  filterEntriesInWindow,
  mapRizeEntryToCalendarEvent,
  normalizeRizeSeconds,
  rizeCategoryFromProject,
  rizeTrackFromProject,
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
  kind: "project",
};

describe("rize integration", () => {
  it("maps learning project to learning category", () => {
    expect(rizeCategoryFromProject("English", null)).toBe("learning");
    expect(rizeTrackFromProject("English")).toBe("english");
  });

  it("builds title from project and description", () => {
    expect(buildRizeEventTitle(baseEntry)).toBe("English — Reading docs");
    expect(buildRizeEventTitle({ ...baseEntry, description: null })).toBe("English");
  });

  it("maps entry to calendar event", () => {
    const ev = mapRizeEntryToCalendarEvent(baseEntry);
    expect(ev).not.toBeNull();
    expect(ev?.rizeEntryId).toBe("project_123");
    expect(ev?.category).toBe("learning");
    expect(ev?.track).toBe("english");
  });

  it("skips very short entries", () => {
    const ev = mapRizeEntryToCalendarEvent({ ...baseEntry, duration: 30 });
    expect(ev).toBeNull();
  });

  it("normalizes minutes to seconds for app usage", () => {
    expect(normalizeRizeSeconds(45, [30, 120, 45])).toBe(45 * 60);
    expect(normalizeRizeSeconds(3600, [7200, 5400])).toBe(3600);
    expect(normalizeRizeSeconds(180_000, [600_000, 120_000])).toBe(180);
  });

  it("maps short app-derived entries", () => {
    const ev = mapRizeEntryToCalendarEvent({
      ...baseEntry,
      id: "app_test",
      kind: "summary",
      source: "apps",
      duration: 45,
    });
    expect(ev).not.toBeNull();
  });

  it("filters entries by sync window", () => {
    const entries = [
      baseEntry,
      {
        ...baseEntry,
        id: "project_456",
        startTime: "2026-06-01T10:00:00.000Z",
        endTime: "2026-06-01T11:00:00.000Z",
      },
    ];
    const filtered = filterEntriesInWindow(entries, {
      start: new Date("2026-07-01T00:00:00.000Z"),
      end: new Date("2026-07-03T00:00:00.000Z"),
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("project_123");
  });
});
