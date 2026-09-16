import { NextResponse } from "next/server";
import { getRedisEnv } from "@/lib/sync/redisEnv";
import {
  buildFollowUpMessage,
  getBotToken,
  sendTelegramMessage,
  statusKeyboard,
} from "@/lib/telegram/bot";
import { getTelegramApplications, saveTelegramApplications } from "@/lib/telegram/store";
import { getFollowUpCandidates } from "@/lib/jobReminders";

export const runtime = "nodejs";

const FOLLOW_UP_DAYS = Number(process.env.JOB_FOLLOWUP_DAYS ?? 4);

async function listTelegramChatIds(): Promise<string[]> {
  const env = getRedisEnv();
  if (!env) return [];
  const { Redis } = await import("@upstash/redis");
  const redis = new Redis(env);
  const keys = await redis.keys("mdp:tg:apps:*");
  return keys.map((k) => k.replace("mdp:tg:apps:", ""));
}

/** Vercel Cron: send one-time follow-up pings for Telegram-tracked applications. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getBotToken()) {
    return NextResponse.json({ skipped: true, reason: "no bot token" });
  }

  const chatIds = await listTelegramChatIds();
  let sent = 0;

  for (const chatId of chatIds) {
    const apps = await getTelegramApplications(chatId);
    const candidates = getFollowUpCandidates(apps, FOLLOW_UP_DAYS);
    let changed = false;

    for (const { application } of candidates) {
      const ok = await sendTelegramMessage(
        chatId,
        buildFollowUpMessage(application),
        statusKeyboard(application.id)
      );
      if (ok) {
        const idx = apps.findIndex((a) => a.id === application.id);
        if (idx >= 0) {
          apps[idx] = {
            ...apps[idx],
            followUpPromptedAt: new Date().toISOString(),
          };
          changed = true;
          sent += 1;
        }
      }
    }

    if (changed) await saveTelegramApplications(chatId, apps);
  }

  return NextResponse.json({ ok: true, sent, chats: chatIds.length });
}
