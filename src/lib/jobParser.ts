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
    .replace(/&#10;/g, "\n")
    .replace(/&#x0a;/gi, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  if (m) return decodeHtml(m[1].trim());
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  const m2 = html.match(re2);
  return m2 ? decodeHtml(m2[1].trim()) : null;
}

function titleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeHtml(m[1].trim()) : null;
}

function firstMeaningfulLine(text: string): string {
  return (
    text
      .split(/\n/)
      .map((l) => l.replace(/^[\s📍🔹•\-–—*]+/, "").trim())
      .find((l) => l.length > 2 && !/^#\w/.test(l) && !/^локаци/i.test(l)) ?? ""
  );
}

function isHashtagTitle(title: string): boolean {
  const tags = title.match(/#\w+/g) ?? [];
  const withoutTags = title.replace(/#\w+/g, "").replace(/\|.+$/, "").trim();
  return tags.length >= 2 || withoutTags.length < 3;
}

/** Turn URL slug fragments like `remote-dataanalyst` into a readable role. */
export function roleFromLinkedInUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    // /posts/{author}_{slug}-activity-{id}
    const post = path.match(/\/posts\/[^/_]+_(.+?)-activity-\d+/i);
    const jobs = path.match(/\/jobs\/view\/([^/?#]+)/i);
    const raw = (post?.[1] ?? jobs?.[1] ?? "").replace(/[_+]+/g, "-");
    if (!raw) return null;

    // Drop leading garbled Cyrillic encodings (auiaug…); keep readable tokens
    const parts = raw.split("-").filter(Boolean);
    const readable = parts.filter(
      (p) =>
        p.length >= 3 &&
        /[a-z]/i.test(p) &&
        !/^aui/i.test(p) &&
        !/^(and|the|for|with)$/i.test(p)
    );
    if (readable.length === 0) return null;

    return readable
      .map((p) => {
        if (/^ml$/i.test(p)) return "ML";
        if (/dataanalyst/i.test(p)) return "Data Analyst";
        if (/machinelearning/i.test(p)) return "Machine Learning";
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      })
      .join(" ");
  } catch {
    return null;
  }
}

function authorFromLinkedInTitle(title: string): string {
  const m = title.match(/\|\s*(.+)$/);
  return m ? m[1].trim() : "";
}

function companyFromDescription(desc: string): string {
  const patterns = [
    /(?:о компании|company)\s*[:：]\s*(.+)/i,
    /(?:компания|company)\s*[:：]\s*(.+)/i,
    /(?:at|@)\s+([A-ZА-ЯЁ][\w.&'’\- ]{1,60})/,
  ];
  for (const re of patterns) {
    const m = desc.match(re);
    if (m?.[1]) {
      let c = m[1].split(/[.\n|]/)[0].trim();
      c = c.replace(/\s*\(NDA\).*$/i, "").trim();
      if (c.length > 2 && c.length < 80) return c;
    }
  }
  return "";
}

function parseHhRu(html: string, url: string): Partial<ParsedJobPosting> {
  const ogTitle = metaContent(html, "og:title");
  const ogDesc = metaContent(html, "og:description");
  const title = titleTag(html);

  let role = ogTitle ?? title ?? "";
  let company = "";

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

  const desc = ogDesc ?? metaContent(html, "description") ?? "";

  return { role, company, description: desc.slice(0, 500), url, source: "hh.ru" };
}

function parseLinkedIn(html: string, url: string): Partial<ParsedJobPosting> {
  const ogTitle = metaContent(html, "og:title") ?? titleTag(html) ?? "";
  const ogDesc =
    metaContent(html, "og:description") ?? metaContent(html, "description") ?? "";

  let role = "";
  let company = "";

  // Classic job page: "Role at Company | LinkedIn"
  const atMatch = ogTitle.match(/^(.+?)\s+at\s+(.+?)(?:\s*\||$)/i);
  if (atMatch && !isHashtagTitle(ogTitle)) {
    role = atMatch[1].trim();
    company = atMatch[2].trim();
  }

  // LinkedIn post / share: title is hashtags; real role is first line of description
  if (!role || isHashtagTitle(ogTitle)) {
    const fromDesc = firstMeaningfulLine(ogDesc);
    if (fromDesc) role = fromDesc;
  }

  if (!role) {
    role = roleFromLinkedInUrl(url) ?? "";
  }

  if (!company) {
    company = companyFromDescription(ogDesc);
  }

  // Poster name is not the hiring company — only use as last resort note
  if (!company) {
    const author = authorFromLinkedInTitle(ogTitle);
    if (author && !/^linkedin$/i.test(author)) {
      company = author;
    }
  }

  // Clean role: drop trailing location emoji lines already handled; trim length
  role = role.replace(/\s+/g, " ").trim().slice(0, 120);

  return {
    role,
    company,
    description: ogDesc.replace(/\s+/g, " ").trim().slice(0, 500),
    url,
    source: "linkedin",
  };
}

function parseGeneric(html: string, url: string): Partial<ParsedJobPosting> {
  const ogTitle = metaContent(html, "og:title") ?? titleTag(html) ?? "";
  const ogDesc =
    metaContent(html, "og:description") ?? metaContent(html, "description") ?? "";

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
    company: partial.company?.trim() || "Unknown company",
    role: partial.role?.trim() || roleFromLinkedInUrl(url) || "Job",
    description: partial.description?.trim() || "",
    url,
    source: partial.source ?? source,
  };
}

export async function fetchAndParseJobUrl(url: string): Promise<ParsedJobPosting> {
  const normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error("Need a full URL (https://…)");
  }

  const res = await fetch(normalized, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Site returned ${res.status}. Enter details manually.`);
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

  let role = lines[0] ?? "Job";
  let company = "Unknown company";
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
