import { describe, expect, it } from "vitest";
import { collectLocalBlobs, hasLocalData, SYNC_STORAGE_KEYS } from "@/lib/sync/client";

describe("sync client", () => {
  it("exports all storage keys", () => {
    expect(SYNC_STORAGE_KEYS).toContain("mdp-schedule");
    expect(SYNC_STORAGE_KEYS).toContain("mdp-timer");
  });

  it("returns empty blobs on server (no window)", () => {
    expect(collectLocalBlobs()).toEqual({});
    expect(hasLocalData()).toBe(false);
  });
});
