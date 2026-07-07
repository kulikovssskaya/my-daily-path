import { describe, expect, it } from "vitest";
import {
  buildQuizQuestions,
  checkAnswer,
  sessionScore,
} from "@/lib/englishQuiz";import type { EnglishVocabWord } from "@/types";

const words: EnglishVocabWord[] = [
  {
    id: "w1",
    term: "stakeholder",
    translationRu: "заинтересованная сторона",
    definition: "a person with interest",
    example: "The stakeholder approved the plan.",
    category: "everyday",
    difficulty: "B1",
  },
  {
    id: "w2",
    term: "roll out",
    translationRu: "внедрять",
    definition: "to launch",
    example: "We will roll out the feature next week.",
    category: "phrasal",
    difficulty: "B1",
  },
  {
    id: "w3",
    term: "orphan term",
    translationRu: "сирота",
    definition: "missing from example",
    example: "This sentence never mentions the word.",
    category: "everyday",
    difficulty: "B1",
  },
];

describe("englishQuiz", () => {
  it("checks answers case-insensitively", () => {
    expect(checkAnswer(
      { id: "q1", type: "multiple_choice", wordId: "w1", prompt: "", correctAnswer: "Stakeholder" },
      "stakeholder"
    )).toBe(true);
  });

  it("builds multiple choice for each word", () => {
    const qs = buildQuizQuestions(words.slice(0, 2));
    const mc = qs.filter((q) => q.type === "multiple_choice");
    expect(mc.length).toBe(2);
    expect(mc[0].options?.length).toBeGreaterThanOrEqual(2);
    expect(mc[0].options).toContain("заинтересованная сторона");
  });

  it("skips fill_blank when term is absent from example", () => {
    const qs = buildQuizQuestions([words[2]]);
    expect(qs.every((q) => q.type === "multiple_choice")).toBe(true);
  });

  it("computes session score", () => {
    expect(sessionScore(5, 10)).toBe(50);
    expect(sessionScore(0, 0)).toBe(0);
    expect(sessionScore(9, 10)).toBe(90);
  });
});
