import { NextResponse } from "next/server";
import { getTelegramApplications } from "@/lib/telegram/store";

export const runtime = "nodejs";

/** Pull applications added via Telegram bot into the web dashboard. */
export async function GET(req: Request) {
  const chatId = new URL(req.url).searchParams.get("chatId")?.trim();
  if (!chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }

  const applications = await getTelegramApplications(chatId);
  return NextResponse.json({ applications });
}
