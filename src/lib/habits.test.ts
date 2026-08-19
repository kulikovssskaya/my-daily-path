import { describe, it, expect } from "vitest";
import { normalizeHabitTime } from "@/lib/habits";

describe("normalizeHabitTime", () => {
  it("pads single-digit hours", () => {
    expect(normalizeHabitTime("6:30")).toBe("06:30");
  });

  it("strips seconds", () => {
    expect(normalizeHabitTime("18:00:00")).toBe("18:00");
  });

  it("falls back for invalid input", () => {
    expect(normalizeHabitTime("")).toBe("18:00");
  });

  it("accepts single-digit minutes", () => {
    expect(normalizeHabitTime("19:0")).toBe("19:00");
  });
});
