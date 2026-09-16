"use client";

import * as React from "react";
import { Bot, Loader2, RefreshCw } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import { getBotUsername } from "@/lib/telegram/botClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TelegramLinkCard() {
  const settings = useCareerStore((s) => s.jobTrackerSettings);
  const setSettings = useCareerStore((s) => s.setJobTrackerSettings);
  const mergeTelegram = useCareerStore((s) => s.mergeTelegramApplications);
  const [syncing, setSyncing] = React.useState(false);
  const [syncMsg, setSyncMsg] = React.useState<string | null>(null);

  const botName = getBotUsername();

  const syncFromTelegram = async () => {
    const chatId = settings.telegramChatId?.trim();
    if (!chatId) {
      setSyncMsg("Укажите Chat ID из Telegram");
      return;
    }
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/telegram/sync?chatId=${encodeURIComponent(chatId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      mergeTelegram(json.applications ?? []);
      setSyncMsg(`Синхронизировано: ${(json.applications ?? []).length} записей`);
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Bot className="size-4" />
        </span>
        <CardTitle className="text-sm">Telegram @{botName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Отправьте ссылку на вакансию боту — она попадёт в дашборд. Узнайте Chat ID через{" "}
          <a
            href={`https://t.me/${botName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            @{botName}
          </a>{" "}
          (команда /start).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={settings.telegramChatId ?? ""}
            onChange={(e) => setSettings({ telegramChatId: e.target.value })}
            placeholder="Telegram Chat ID"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={syncFromTelegram}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs hover:bg-muted"
          >
            {syncing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Синхронизировать
          </button>
        </div>
        {syncMsg ? <p className="text-xs text-muted-foreground">{syncMsg}</p> : null}
      </CardContent>
    </Card>
  );
}
