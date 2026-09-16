import { NextResponse } from "next/server";
import {
  answerCallbackQuery,
  applicationFromText,
  getBotToken,
  getBotUsername,
  sendTelegramMessage,
  type TelegramUpdate,
} from "@/lib/telegram/bot";
import {
  getTelegramApplications,
  saveTelegramApplications,
  upsertTelegramApplication,
} from "@/lib/telegram/store";
import {
  extractUrls,
  fetchAndParseJobUrl,
  parseManualJobText,
} from "@/lib/jobParser";
import type { ApplicationStatus } from "@/types";
import { STATUS_LABELS_RU } from "@/lib/jobAnalytics";

export const runtime = "nodejs";

async function handleStart(chatId: string) {
  await sendTelegramMessage(
    chatId,
    `👋 Привет! Я бот <b>@${getBotUsername()}</b> для трекера откликов.\n\n` +
      `Отправьте ссылку на вакансию (hh.ru, LinkedIn, сайт компании) — ` +
      `она появится в дашборде My Daily Path.\n\n` +
      `Команды:\n` +
      `/list — ваши активные отклики\n` +
      `/help — справка`
  );
}

async function handleJobLink(chatId: string, text: string, messageId: number) {
  const urls = extractUrls(text);
  const url = urls[0];

  if (!url) {
    await sendTelegramMessage(
      chatId,
      "Не нашёл ссылку. Отправьте URL вакансии или текст с описанием."
    );
    return;
  }

  let parsed;
  try {
    parsed = await fetchAndParseJobUrl(url);
  } catch {
    parsed = parseManualJobText(text, url);
    parsed.parseError = "Парсинг заблокирован — сохранено из текста сообщения";
  }

  const app = applicationFromText(parsed, messageId);
  await upsertTelegramApplication(chatId, app);

  await sendTelegramMessage(
    chatId,
    `✅ Добавлено: <b>${app.role}</b> @ ${app.company}\n` +
      `Статус: ${STATUS_LABELS_RU.applied}\n` +
      (app.url ? `<a href="${app.url}">Ссылка</a>` : "")
  );
}

async function handleList(chatId: string) {
  const apps = await getTelegramApplications(chatId);
  const active = apps.filter((a) => ["applied", "interview"].includes(a.status));
  if (active.length === 0) {
    await sendTelegramMessage(chatId, "Активных откликов пока нет.");
    return;
  }
  const lines = active
    .slice(0, 10)
    .map(
      (a, i) =>
        `${i + 1}. ${a.role} @ ${a.company} — ${STATUS_LABELS_RU[a.status]}` +
        (a.url ? `\n   ${a.url}` : "")
    )
    .join("\n\n");
  await sendTelegramMessage(chatId, `<b>Активные отклики:</b>\n\n${lines}`);
}

async function handleCallback(data: string, chatId: string, callbackId: string) {
  const [, appId, status] = data.split(":");
  if (!appId || !status) return;

  const apps = await getTelegramApplications(chatId);
  const idx = apps.findIndex((a) => a.id === appId);
  if (idx < 0) {
    await answerCallbackQuery(callbackId, "Вакансия не найдена");
    return;
  }

  apps[idx] = {
    ...apps[idx],
    status: status as ApplicationStatus,
    updatedAt: new Date().toISOString(),
    followUpPromptedAt: new Date().toISOString(),
  };
  await saveTelegramApplications(chatId, apps);
  await answerCallbackQuery(callbackId, `Статус: ${STATUS_LABELS_RU[status as ApplicationStatus]}`);
  await sendTelegramMessage(
    chatId,
    `Обновлено: ${apps[idx].role} → <b>${STATUS_LABELS_RU[status as ApplicationStatus]}</b>`
  );
}

export async function POST(req: Request) {
  if (!getBotToken()) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 503 });
  }

  const update = (await req.json()) as TelegramUpdate;

  if (update.callback_query?.data?.startsWith("status:")) {
    const chatId = String(update.callback_query.message?.chat.id ?? "");
    await handleCallback(update.callback_query.data, chatId, update.callback_query.id);
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  if (text === "/start" || text === "/help") {
    await handleStart(chatId);
  } else if (text === "/list") {
    await handleList(chatId);
  } else if (/https?:\/\//i.test(text)) {
    await handleJobLink(chatId, text, msg.message_id);
  } else {
    await sendTelegramMessage(
      chatId,
      "Отправьте ссылку на вакансию или используйте /help"
    );
  }

  return NextResponse.json({ ok: true });
}
