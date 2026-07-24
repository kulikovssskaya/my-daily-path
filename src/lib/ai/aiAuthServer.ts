import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SYNC_KEY_HEADER } from "@/lib/sync/syncAuth";

function getAiSecret(): string | null {
  return (
    process.env.AI_API_SECRET?.trim() ||
    process.env.SYNC_SECRET?.trim() ||
    null
  );
}

/** When set on the server, AI routes require the same code as cloud sync. */
export function requiresAiAuth(): boolean {
  return Boolean(getAiSecret());
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyAiRequest(req: Request): boolean {
  const secret = getAiSecret();
  if (!secret) return true;
  const provided = req.headers.get(SYNC_KEY_HEADER)?.trim();
  if (!provided) return false;
  return safeEqual(provided, secret);
}

export function guardAiRequest(req: Request): NextResponse | null {
  if (requiresAiAuth() && !verifyAiRequest(req)) {
    return NextResponse.json(
      {
        error:
          "Invalid or missing sync code. Enable sync in the sidebar and enter your personal code.",
        needsKey: true,
      },
      { status: 401 }
    );
  }
  return null;
}
