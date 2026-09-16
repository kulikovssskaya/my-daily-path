import type { JobSource, ParsedJobPosting } from "@/types";

const URL_RE =
  /https?:\/\/(?:[\w-]+\.)?(?:hh\.ru|linkedin\.com|t\.me|telegram\.me|www\.)[^\s<>"']+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[),.;]+$/, "")))];
}

export function detectJobSource(url: string): JobSource {
  const u = url.toLowerCase();
  if (u.includes("hh.ru")) return "hh.ru";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("t.me") || u.includes("telegram.me")) return "telegram";
  return "website";
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const m = html.match(re);
  if (m) return decodeHtml(m[1].trim());
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  const m2 = html.match(re2);
  return m2 ? decodeHtml(m2[1].trim()) : null;
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeHtml(m[1].trim()) : null;
}

function parseHhRu(html: string, url: string): Partial<ParsedJobPosting> {
  const ogTitle = metaContent(html, "og:title");
  const ogDesc = metaContent(html, "og:description");
  const title = titleTag(html);

  let role = ogTitle ?? title ?? "";
  let company = "";

  // "Role — Company — hh.ru" or "Role в Company, ..."
  const dashParts = role.split(/\s*[—–-]\s*/);
  if (dashParts.length >= 2) {
    role = dashParts[0].trim();
    company = dashParts[1].replace(/,?\s*hh\.ru.*$/i, "").trim();
  }

  const companyMeta = metaContent(html, "og:site_name");
  if (!company && companyMeta && !/hh\.ru/i.test(companyMeta)) {
    company = companyMeta;
  }

  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]) as Record<string, unknown>;
      const org =
        (data.hiringOrganization as { name?: string })?.name ??
        (data.employer as { name?: string })?.name;
      if (typeof org === "string" && org) company = org;
      if (typeof data.title === "string" && data.title) role = data.title;
      if (typeof data.description === "string" && data.description && !ogDesc) {
        return {
          role,
          company,
          description: data.description.slice(0, 500),
          url,
          source: "hh.ru",
        };
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }

  const desc =
    ogDesc ??
    metaContent(html, "description") ??
    "";

  return { role, company, description: desc.slice(0, 500), url, source: "hh.ru" };
}

function parseLinkedIn(html: string, url: string): Partial<ParsedJobPosting> {
  const ogTitle = metaContent(html, "og:title") ?? titleTag(html) ?? "";
  const ogDesc = metaContent(html, "og:description") ?? "";

  let role = ogTitle;
  let company = "";

  const atMatch = ogTitle.match(/^(.+?)\s+at\s+(.+?)(?:\s*\||$)/i);
  if (atMatch) {
    role = atMatch[1].trim();
    company = atMatch[2].trim();
  }

  return {
    role,
    company,
    description: ogDesc.slice(0, 500),
    url,
    source: "linkedin",
  };
}

function parseGeneric(html: string, url: string): Partial<ParsedJobPosting> {
  const ogTitle = metaContent(html, "og:title") ?? titleTag(html) ?? "";
  const ogDesc =
    metaContent(html, "og:description") ??
    metaContent(html, "description") ??
    "";

  return {
    role: ogTitle,
    company: metaContent(html, "og:site_name") ?? "",
    description: ogDesc.slice(0, 500),
    url,
    source: detectJobSource(url),
  };
}

export function parseJobHtml(html: string, url: string): ParsedJobPosting {
  const source = detectJobSource(url);
  const partial =
    source === "hh.ru"
      ? parseHhRu(html, url)
      : source === "linkedin"
        ? parseLinkedIn(html, url)
        : parseGeneric(html, url);

  return {
    company: partial.company?.trim() || "Неизвестная компания",
    role: partial.role?.trim() || "Вакансия",
    description: partial.description?.trim() || "",
    url,
    source: partial.source ?? source,
  };
}

export async function fetchAndParseJobUrl(url: string): Promise<ParsedJobPosting> {
  const normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error("Нужна полная ссылка (https://…)");
  }

  const res = await fetch(normalized, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MyDailyPath/1.0; +https://my-daily-path-ebon.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    throw new Error(`Сайт вернул ${res.status}. Вставьте описание вручную.`);
  }

  const html = await res.text();
  return parseJobHtml(html, normalized);
}

/** Parse free-form text (Telegram message or manual paste). */
export function parseManualJobText(text: string, fallbackUrl?: string): ParsedJobPosting {
  const urls = extractUrls(text);
  const url = fallbackUrl ?? urls[0] ?? "";
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let role = lines[0] ?? "Вакансия";
  let company = "Неизвестная компания";
  const description = lines.slice(1).join("\n").slice(0, 500);

  const dash = role.match(/^(.+?)\s*[—–-]\s*(.+)$/);
  if (dash) {
    role = dash[1].trim();
    company = dash[2].trim();
  }

  return {
    company,
    role,
    description,
    url,
    source: url ? detectJobSource(url) : "manual",
  };
}
