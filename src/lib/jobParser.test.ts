import { describe, expect, it } from "vitest";
import {
  detectJobSource,
  extractFromJobPostText,
  extractUrls,
  parseHabrCareerTitle,
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
    expect(detectJobSource("https://career.habr.com/vacancies/1000123456")).toBe("habr");
  });

  it("parses Habr Career title into role and company", () => {
    const { role, company } = parseHabrCareerTitle(
      "Вакансия «Ищем Data Scientist», удаленно, работа в компании «Top Selection» — Хабр Карьера"
    );
    expect(role).toBe("Data Scientist");
    expect(company).toBe("Top Selection");
  });

  it("parses Habr Career HTML page", () => {
    const html = `
      <html><head>
        <title>Вакансия «Ищем Data Scientist», удаленно, работа в компании «Top Selection» — Хабр Карьера</title>
        <meta property="og:title" content="Вакансия «Ищем Data Scientist», удаленно, работа в компании «Top Selection» — Хабр Карьера" />
        <meta property="og:description" content="Удалённая работа. Python, ML." />
      </head></html>`;
    const parsed = parseJobHtml(html, "https://career.habr.com/vacancies/1000123456");
    expect(parsed.role).toBe("Data Scientist");
    expect(parsed.company).toBe("Top Selection");
    expect(parsed.source).toBe("habr");
    expect(parsed.description).toContain("Python");
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

  it("parses pasted Habr Career title as manual text", () => {
    const parsed = parseManualJobText(
      "Вакансия «Ищем Data Scientist», удаленно, работа в компании «Top Selection» — Хабр Карьера"
    );
    expect(parsed.role).toBe("Data Scientist");
    expect(parsed.company).toBe("Top Selection");
    expect(parsed.source).toBe("habr");
  });
});
