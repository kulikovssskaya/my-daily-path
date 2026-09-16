import { describe, expect, it } from "vitest";
import {
  detectJobSource,
  extractUrls,
  parseJobHtml,
  parseManualJobText,
} from "@/lib/jobParser";

describe("jobParser", () => {
  it("extracts URLs from text", () => {
    const text = "Смотри https://hh.ru/vacancy/123 и https://linkedin.com/jobs/view/456";
    expect(extractUrls(text)).toEqual([
      "https://hh.ru/vacancy/123",
      "https://linkedin.com/jobs/view/456",
    ]);
  });

  it("detects source from URL", () => {
    expect(detectJobSource("https://hh.ru/vacancy/1")).toBe("hh.ru");
    expect(detectJobSource("https://www.linkedin.com/jobs/1")).toBe("linkedin");
  });

  it("parses hh.ru HTML meta tags", () => {
    const html = `
      <html><head>
        <title>Data Scientist — Яндекс — hh.ru</title>
        <meta property="og:title" content="Data Scientist — Яндекс" />
        <meta property="og:description" content="ML team, Python, SQL" />
      </head></html>`;
    const parsed = parseJobHtml(html, "https://hh.ru/vacancy/1");
    expect(parsed.role).toContain("Data Scientist");
    expect(parsed.company).toContain("Яндекс");
    expect(parsed.description).toContain("ML team");
  });

  it("parses manual text fallback", () => {
    const parsed = parseManualJobText(
      "Backend Developer — Ozon\nPython, FastAPI, PostgreSQL",
      "https://example.com/job"
    );
    expect(parsed.role).toBe("Backend Developer");
    expect(parsed.company).toBe("Ozon");
    expect(parsed.source).toBe("website");
  });
});
