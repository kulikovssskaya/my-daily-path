import { describe, expect, it } from "vitest";
import {
  detectJobSource,
  extractFromJobPostText,
  extractUrls,
  parseJobHtml,
  parseManualJobText,
  roleFromLinkedInUrl,
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

  it("parses LinkedIn post: role and company from body, not hashtags/author", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="#вакансия #remote #dataanalyst #ml #igaming #cyprus | Anastasiia B." />
        <meta property="og:description" content="

Data Analyst Middle/Middle+ (iGaming / ML-решения)

📍Локация: Гибрид (Лимассол)

О компании: Растущая продуктовая IT-компания (NDA), на рынке уже больше года. Создает ML-продукты." />
      </head></html>`;
    const url =
      "https://www.linkedin.com/posts/anastasiia-b-b1b17240a_auiaugauqaugautauxauoavl-remote-dataanalyst-activity-7501557684911988736-vir4";
    const parsed = parseJobHtml(html, url);
    expect(parsed.role).toMatch(/Data Analyst Middle/i);
    expect(parsed.role).not.toMatch(/#вакансия|Anastasiia/i);
    expect(parsed.company).toMatch(/NDA/i);
    expect(parsed.company).not.toMatch(/Anastasiia/i);
    expect(parsed.source).toBe("linkedin");
  });

  it("extracts role and company from pasted post text", () => {
    const out = extractFromJobPostText(
      `Product Analyst\n\nО компании: Acme Corp\nУдалёнка`,
      { hashtagsTitle: "#вакансия | Someone" }
    );
    expect(out.role).toBe("Product Analyst");
    expect(out.company).toBe("Acme Corp");
  });

  it("extracts role hint from LinkedIn post URL slug", () => {
    const role = roleFromLinkedInUrl(
      "https://www.linkedin.com/posts/user_auiaug-remote-dataanalyst-activity-123-xyz"
    );
    expect(role).toMatch(/Data Analyst/i);
    expect(role).toMatch(/Remote/i);
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
