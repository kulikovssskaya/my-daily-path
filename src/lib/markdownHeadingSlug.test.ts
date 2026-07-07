import { describe, expect, it } from "vitest";
import { markdownHeadingSlug } from "@/lib/markdownHeadingSlug";
import fs from "node:fs";
import path from "node:path";

describe("markdownHeadingSlug", () => {
  it("slugifies simple Cyrillic headings", () => {
    expect(markdownHeadingSlug("Логистическая регрессия")).toBe(
      "логистическая-регрессия"
    );
  });

  it("includes parenthetical suffix", () => {
    expect(markdownHeadingSlug("Метод опорных векторов (SVM)")).toBe(
      "метод-опорных-векторов-svm"
    );
    expect(markdownHeadingSlug("Рекуррентные сети (RNN / LSTM)")).toBe(
      "рекуррентные-сети-rnn--lstm"
    );
  });

  it("matches ds-cheatsheet TOC anchors", () => {
    const md = fs.readFileSync(
      path.join(process.cwd(), "knowledge-base/interview/ds-cheatsheet.md"),
      "utf8"
    );

    const tocLinks = [...md.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
    const headings = [...md.matchAll(/^## (.+)$/gm)]
      .map((m) => m[1])
      .filter((h) => h !== "Содержание");

    const slugByHeading = new Map(
      headings.map((h) => [h, markdownHeadingSlug(h)])
    );

    for (const link of tocLinks) {
      const match = headings.find((h) => slugByHeading.get(h) === link);
      expect(match, `no heading for anchor #${link}`).toBeTruthy();
    }
  });
});
