import type { ApplicationStatus, JobApplication } from "@/types";
import { STATUS_LABELS_RU } from "@/lib/jobAnalytics";
import { uid } from "@/lib/utils";

const TELEGRAM_API = "https://api.telegram.org/bot";

export function getBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token || null;
}

export function getBotUsername(): string {
  return process.env.TELEGRAM_BOT_USERNAME?.trim() || "search_jooobbb_bot";
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    text?: string;
    from?: { id: number; username?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
}

export type { TelegramUpdate };

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: object
): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;

  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
      reply_markup: replyMarkup,
    }),
  });
  return res.ok;
}

export function statusKeyboard(appId: string) {
  const statuses: ApplicationStatus[] = ["interview", "rejected", "ignored"];
  return {
    inline_keyboard: [
      statuses.map((s) => ({
        text: STATUS_LABELS_RU[s],
        callback_data: `status:${appId}:${s}`,
      })),
    ],
  };
}

export function buildFollowUpMessage(app: JobApplication): string {
  const link = app.url ? `\n<a href="${app.url}">Открыть вакансию</a>` : "";
  return (
    `⏰ <b>Что по вакансии?</b>\n` +
    `${app.role} @ ${app.company}${link}\n\n` +
    `Выберите актуальный статус:`
  );
}

export function applicationFromText(
  parsed: {
    company: string;
    role: string;
    description: string;
    url: string;
    source: JobApplication["source"];
  },
  messageId?: number
): JobApplication {
  const now = new Date().toISOString();
  return {
    id: uid("tg-app"),
    company: parsed.company,
    role: parsed.role,
    description: parsed.description,
    url: parsed.url,
    source: parsed.source,
    status: "applied",
    appliedAt: now,
    createdAt: now,
    updatedAt: now,
    telegramMessageId: messageId,
  };
}

export async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const token = getBotToken();
  if (!token) return;
  await fetch(`${TELEGRAM_API}${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}
