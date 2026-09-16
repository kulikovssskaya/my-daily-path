import { NextResponse } from "next/server";
import {
  fetchAndParseJobUrl,
  parseManualJobText,
  extractUrls,
} from "@/lib/jobParser";
import type { ParsedJobPosting } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const manualText = typeof body?.manualText === "string" ? body.manualText.trim() : "";

  if (!url && !manualText) {
    return NextResponse.json(
      { error: "Укажите ссылку или текст вакансии" },
      { status: 400 }
    );
  }

  let parsed: ParsedJobPosting;

  if (url) {
    try {
      parsed = await fetchAndParseJobUrl(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось распарсить ссылку";
      if (manualText) {
        parsed = {
          ...parseManualJobText(manualText, url),
          parseError: message,
        };
      } else {
        return NextResponse.json(
          {
            error: message,
            fallback: true,
            partial: parseManualJobText("", url),
          },
          { status: 422 }
        );
      }
    }
  } else {
    const urls = extractUrls(manualText);
    parsed = parseManualJobText(manualText, urls[0]);
  }

  return NextResponse.json({ data: parsed });
}
