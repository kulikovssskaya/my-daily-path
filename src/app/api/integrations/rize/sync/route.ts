import { NextResponse } from "next/server";
import {
  resolveSyncWindow,
  syncRizeCalendarEvents,
} from "@/lib/integrations/rize";

export const runtime = "nodejs";

function parseIntParam(value: string | null, fallback: number, min: number, max: number) {
  const n = value ? Number.parseInt(value, 10) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = process.env.RIZE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "RIZE_API_KEY is not set in .env.local" },
      { status: 503 }
    );
  }

  const url = new URL(req.url);
  const lookbackHours = parseIntParam(url.searchParams.get("lookbackHours"), 168, 1, 24 * 30);
  const lookaheadDays = parseIntParam(url.searchParams.get("lookaheadDays"), 1, 0, 14);
  const generate = url.searchParams.get("generate") === "true";

  try {
    const window = resolveSyncWindow(lookbackHours, lookaheadDays);
    const { events, stats } = await syncRizeCalendarEvents(apiKey, window, {
      generateIfEmpty: generate,
    });
    return NextResponse.json({
      ok: true,
      count: events.length,
      stats,
      window: {
        start: window.start.toISOString(),
        end: window.end.toISOString(),
      },
      events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rize sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  const configured = Boolean(process.env.RIZE_API_KEY?.trim());
  return NextResponse.json({ configured });
}
