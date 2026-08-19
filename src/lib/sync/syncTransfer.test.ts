import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  collectChangedBlobsForPush,
  fingerprintBlob,
  markBlobsPushed,
  readPushedHashes,
  SYNC_PUSHED_HASHES_STORAGE,
} from "@/lib/sync/syncTransfer";
import { buildSyncSummary, emptySyncSummary } from "@/lib/sync/syncSummary";

function installLocalStorageMock() {
  const store = new Map<string, string>();
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
  });
}

describe("fingerprintBlob", () => {
  it("is stable for the same input", () => {
    expect(fingerprintBlob("abc")).toBe(fingerprintBlob("abc"));
  });

  it("changes when content changes", () => {
    expect(fingerprintBlob("abc")).not.toBe(fingerprintBlob("abd"));
  });
});

describe("collectChangedBlobsForPush", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("returns empty when nothing is stored", () => {
    expect(collectChangedBlobsForPush()).toEqual({});
  });

  it("includes meaningful blobs that were never pushed", () => {
    const raw = JSON.stringify({
      state: { logs: [{ id: "1", date: "2026-07-01" }], tracks: [] },
    });
    localStorage.setItem("mdp-progress", raw);
    const changed = collectChangedBlobsForPush();
    expect(changed["mdp-progress"]).toBe(raw);
  });

  it("skips blobs that match the last pushed hash", () => {
    const raw = JSON.stringify({
      state: { logs: [{ id: "1", date: "2026-07-01" }], tracks: [] },
    });
    localStorage.setItem("mdp-progress", raw);
    markBlobsPushed({ "mdp-progress": raw });
    expect(collectChangedBlobsForPush()).toEqual({});
    expect(readPushedHashes()["mdp-progress"]).toBe(fingerprintBlob(raw));
  });

  it("includes a blob again after local content changes", () => {
    const first = JSON.stringify({
      state: { logs: [{ id: "1", date: "2026-07-01" }], tracks: [] },
    });
    const second = JSON.stringify({
      state: {
        logs: [
          { id: "1", date: "2026-07-01" },
          { id: "2", date: "2026-07-02" },
        ],
        tracks: [],
      },
    });
    localStorage.setItem("mdp-progress", first);
    markBlobsPushed({ "mdp-progress": first });
    localStorage.setItem("mdp-progress", second);
    expect(collectChangedBlobsForPush()["mdp-progress"]).toBe(second);
  });

  it("persists hashes under the expected key", () => {
    markBlobsPushed({ "mdp-progress": '{"state":{"logs":[1]}}' });
    const raw = localStorage.getItem(SYNC_PUSHED_HASHES_STORAGE);
    expect(raw).toContain("mdp-progress");
  });
});

describe("buildSyncSummary", () => {
  it("returns empty summary for missing blobs", () => {
    expect(buildSyncSummary(undefined)).toEqual(emptySyncSummary());
  });

  it("extracts schedule and english stats", () => {
    const summary = buildSyncSummary({
      "mdp-schedule": JSON.stringify({
        state: {
          events: [
            { start: "2026-07-01T10:00:00", meta: { rizeEntryId: "r1" } },
            { start: "2026-07-10T10:00:00" },
          ],
        },
      }),
      "mdp-english": JSON.stringify({
        state: { history: [1, 2, 3], stats: { averageScore: 80 } },
      }),
    });
    expect(summary.scheduleEvents).toBe(2);
    expect(summary.importedEvents).toBe(1);
    expect(summary.latestEventDay).toBe("2026-07-10");
    expect(summary.englishDays).toBe(3);
    expect(summary.englishAvg).toBe(80);
  });
});
