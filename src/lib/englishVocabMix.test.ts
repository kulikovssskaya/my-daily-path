import { describe, expect, it } from "vitest";
import {
  categoryMixTargets,
  collectKnownTerms,
  finalizeVocabDrop,
  isEverydayCategory,
  isTechCategory,
} from "./englishVocabMix";
import {
  getFallbackEverydayPack,
  getFallbackTechPack,
} from "./englishConstants";

describe("englishVocabMix", () => {
  it("targets an even everyday/tech split", () => {
    expect(categoryMixTargets(20)).toEqual({ everydayTarget: 10, techTarget: 10 });
    expect(categoryMixTargets(23)).toEqual({ everydayTarget: 11, techTarget: 12 });
  });

  it("filters known terms and keeps a 50/50 mix", () => {
    const words = finalizeVocabDrop(
      [
        {
          term: "deploy",
          translationRu: "развернуть",
          definition: "release software",
          example: "Deploy after tests.",
          category: "it",
          difficulty: "B1+",
        },
      ],
      6,
      ["deploy", "make sense"],
      getFallbackEverydayPack(),
      getFallbackTechPack()
    );

    expect(words).toHaveLength(6);
    expect(words.some((w) => w.term.toLowerCase() === "deploy")).toBe(false);
    expect(words.some((w) => w.term.toLowerCase() === "make sense")).toBe(false);

    const everyday = words.filter((w) => isEverydayCategory(w.category)).length;
    const tech = words.filter((w) => isTechCategory(w.category)).length;
    expect(everyday).toBe(3);
    expect(tech).toBe(3);
  });

  it("pads to full pool with 50/50 when AI returns only everyday words", () => {
    const words = finalizeVocabDrop(
      [
        {
          term: "hang out",
          translationRu: "тусоваться",
          definition: "spend time",
          example: "We hang out often.",
          category: "phrasal",
          difficulty: "B1",
        },
        {
          term: "day off",
          translationRu: "выходной",
          definition: "no work day",
          example: "I need a day off.",
          category: "everyday",
          difficulty: "B1",
        },
      ],
      20,
      [],
      getFallbackEverydayPack(),
      getFallbackTechPack()
    );

    expect(words).toHaveLength(20);
    expect(words.filter((w) => isEverydayCategory(w.category))).toHaveLength(10);
    expect(words.filter((w) => isTechCategory(w.category))).toHaveLength(10);
  });

  it("collects known terms from vocabulary and history", () => {
    const terms = collectKnownTerms(
      [
        { id: "w1", term: "deploy" },
        { id: "w2", term: "commute" },
      ],
      [{ wordIds: ["w2", "missing"] }]
    );
    expect(terms).toEqual(expect.arrayContaining(["deploy", "commute"]));
  });
});
