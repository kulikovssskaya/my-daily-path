import { describe, expect, it } from "vitest";
import {
  matchesEnglishTerm,
  matchesTranslation,
  matchesFinalReviewAnswer,
} from "./englishAnswerMatch";

describe("englishAnswerMatch", () => {
  it("ignores case for English terms", () => {
    expect(matchesEnglishTerm("Roll Out", "roll out")).toBe(true);
  });

  it("accepts approximate Russian translation", () => {
    expect(matchesTranslation("внедрять", "внедрять, развернуть")).toBe(true);
    expect(matchesTranslation("развернуть", "внедрять, развернуть")).toBe(true);
  });

  it("accepts partial overlap", () => {
    expect(matchesTranslation("практический", "практический опыт")).toBe(true);
  });

  it("accepts close Russian synonyms (разложить ≈ разобрать)", () => {
    expect(matchesTranslation("разложить на части", "разобрать на части")).toBe(true);
    expect(matchesTranslation("разложить на части", "разобрать")).toBe(true);
  });

  it("final review accepts term or translation", () => {
    expect(
      matchesFinalReviewAnswer("stakeholder", "stakeholder", "заинтересованная сторона")
    ).toBe(true);
    expect(
      matchesFinalReviewAnswer("заинтересованная", "stakeholder", "заинтересованная сторона")
    ).toBe(true);
  });
});
