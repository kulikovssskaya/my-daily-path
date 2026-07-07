import { describe, expect, it } from "vitest";
import {
  isMeaningfulBlob,
  mergeBlobsSafely,
} from "@/lib/sync/blobUtils";

describe("mergeBlobsSafely", () => {
  it("keeps existing events when phone sends empty defaults", () => {
    const big = '{"state":{"events":[{"id":"1"}]}}';
    const small = '{"state":{"events":[]}}';
    const merged = mergeBlobsSafely(
      { "mdp-schedule": big },
      { "mdp-schedule": small }
    );
    const state = JSON.parse(merged["mdp-schedule"]!) as {
      state: { events: { id: string }[] };
    };
    expect(state.state.events).toEqual([{ id: "1" }]);
  });

  it("merges schedule blobs by union instead of blob size", () => {
    const rize = JSON.stringify({
      state: {
        events: [
          {
            id: "ev_rize",
            title: "Rize",
            category: "work",
            start: "2026-07-07T09:00:00",
            end: "2026-07-07T10:00:00",
            status: "done",
            priority: 3,
            meta: { rizeEntryId: "rize-1" },
          },
        ],
        habits: [],
      },
    });
    const manual = JSON.stringify({
      state: {
        events: Array.from({ length: 20 }, (_, i) => ({
          id: `ev_${i}`,
          title: `Task ${i}`,
          category: "learning",
          start: `2026-07-07T${String(10 + (i % 5)).padStart(2, "0")}:00:00`,
          end: `2026-07-07T${String(11 + (i % 5)).padStart(2, "0")}:00:00`,
          status: "planned",
          priority: 2,
        })),
        habits: [],
      },
    });
    expect(manual.length).toBeGreaterThan(rize.length);
    const merged = mergeBlobsSafely({ "mdp-schedule": rize }, { "mdp-schedule": manual });
    const state = JSON.parse(merged["mdp-schedule"]!) as {
      state: { events: { meta?: { rizeEntryId?: string } }[] };
    };
    expect(state.state.events.some((e) => e.meta?.rizeEntryId === "rize-1")).toBe(true);
    expect(state.state.events.length).toBe(21);
  });
});

describe("isMeaningfulBlob", () => {
  it("detects english vocabulary", () => {
    const raw = JSON.stringify({
      state: { vocabulary: [{ id: "1", word: "test" }], history: [], srs: {} },
    });
    expect(isMeaningfulBlob("mdp-english", raw)).toBe(true);
  });

  it("rejects empty english defaults", () => {
    const raw = JSON.stringify({ state: { vocabulary: [], history: [], srs: {} } });
    expect(isMeaningfulBlob("mdp-english", raw)).toBe(false);
  });
});
