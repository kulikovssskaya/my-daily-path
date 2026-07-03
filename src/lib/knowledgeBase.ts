import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Knowledge base loader.
 *
 * Content lives as Markdown files (with YAML frontmatter) under the repo-root
 * `knowledge-base/` folder. Drop a new `.md` file with frontmatter and it shows
 * up automatically in the site — no code changes needed.
 */

const KB_DIR = path.join(process.cwd(), "knowledge-base");

export interface KbArticleMeta {
  slug: string;
  title: string;
  section: string;
  summary: string;
  tags: string[];
  source?: string;
  imported?: string;
  updated?: string;
  status: string;
}

export interface KbArticle extends KbArticleMeta {
  body: string;
}

/** Sections that are planned but not yet imported from Notion. */
export interface PlannedSection {
  section: string;
  notion: string;
}

export const PLANNED_SECTIONS: PlannedSection[] = [
  { section: "Вводные", notion: "https://peat-possum-c31.notion.site/1d17ef40048944a9b40f4c92ea0715f3" },
  { section: "Python", notion: "https://peat-possum-c31.notion.site/Python-929e0fa837974c6a835fab17ab457829" },
  { section: "Pandas", notion: "https://peat-possum-c31.notion.site/Pandas-0ddba042bbd8453aa941c2ff4ba7f2eb" },
  { section: "Matplotlib", notion: "https://peat-possum-c31.notion.site/Matplotlib-2198b85aafc080f7899dcc6a5125203a" },
  { section: "Алгоритмы", notion: "https://peat-possum-c31.notion.site/2578b85aafc08054a739c0393d413331" },
  { section: "Modeling", notion: "https://peat-possum-c31.notion.site/Modeling-2318b85aafc08070b0d4f17c57b716d5" },
  { section: "БД", notion: "https://peat-possum-c31.notion.site/7ddb789631fc4ad1aaa151542278c53e" },
  { section: "API", notion: "https://peat-possum-c31.notion.site/API-e8ff36bbf9cc4035b2eb7cfd87c0ca59" },
  { section: "Airflow", notion: "https://peat-possum-c31.notion.site/Airflow-2998b85aafc08035922bd5a31fda0881" },
  { section: "Marketing", notion: "https://peat-possum-c31.notion.site/Marketing-24c8b85aafc080a2a1abeb5f17066d2f" },
  { section: "Deployment", notion: "https://peat-possum-c31.notion.site/Deployment-2858b85aafc0806e8f07ec1086cc06cf" },
];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".md") &&
      entry.name.toLowerCase() !== "readme.md"
    ) {
      out.push(full);
    }
  }
  return out;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

/** First meaningful paragraph of the body, used as a card summary. */
function deriveSummary(content: string): string {
  const lines = content.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue; // heading
    if (line.startsWith(">")) continue; // blockquote / callout
    if (line.startsWith("|")) continue; // table
    if (line.startsWith("---")) continue; // divider
    if (line.startsWith("```")) continue; // code fence
    return line.replace(/[*_`>#]/g, "").slice(0, 200);
  }
  return "";
}

function parse(file: string): KbArticle {
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const slug = path.basename(file, ".md");
  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    section: typeof data.section === "string" ? data.section : "Прочее",
    summary: typeof data.summary === "string" ? data.summary : deriveSummary(content),
    tags: toStringArray(data.tags),
    source: typeof data.source === "string" ? data.source : undefined,
    imported: typeof data.imported === "string" ? data.imported : undefined,
    updated: typeof data.updated === "string" ? data.updated : undefined,
    status: typeof data.status === "string" ? data.status : "ready",
    body: content,
  };
}

export function getAllArticles(): KbArticleMeta[] {
  return walk(KB_DIR)
    .map(parse)
    .map(({ body: _body, ...meta }) => meta)
    .sort((a, b) => a.section.localeCompare(b.section, "ru"));
}

export function getArticle(slug: string): KbArticle | null {
  const file = walk(KB_DIR).find((f) => path.basename(f, ".md") === slug);
  return file ? parse(file) : null;
}

/** Planned sections that don't yet have an imported article. */
export function getPendingSections(): PlannedSection[] {
  const importedSections = new Set(getAllArticles().map((a) => a.section));
  return PLANNED_SECTIONS.filter((p) => !importedSections.has(p.section));
}
