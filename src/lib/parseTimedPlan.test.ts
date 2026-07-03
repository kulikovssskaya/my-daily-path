import { describe, expect, it } from "vitest";
import { parseExplicitBlocks, isoAt } from "@/lib/parseTimedPlan";

describe("parseExplicitBlocks", () => {
  it("parses HH:MM–HH:MM lines", () => {
    const blocks = parseExplicitBlocks("09:00–10:30 Python basics\n11:00-12:00 ML intro");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].startMin).toBe(9 * 60);
    expect(blocks[0].endMin).toBe(10 * 60 + 30);
    expect(blocks[0].title.toLowerCase()).toContain("python");
  });

  it("ignores meta-only lines", () => {
    const blocks = parseExplicitBlocks("only add this\n09:00–10:00 Focus work");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].title.toLowerCase()).toContain("focus");
  });
});

describe("isoAt", () => {
  it("formats local naive ISO", () => {
    const d = new Date(2026, 6, 2);
    expect(isoAt(d, 9 * 60 + 5)).toBe("2026-07-02T09:05:00");
  });
});
