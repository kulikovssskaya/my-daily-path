"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";

/** Quiet auto-sync from SearchJob bot. Settings only if chat ID missing. */
export function MonitorSyncCard() {
  const settings = useCareerStore((s) => s.jobTrackerSettings);
  const setSettings = useCareerStore((s) => s.setJobTrackerSettings);
  const mergeMonitor = useCareerStore((s) => s.mergeMonitorApplications);
  const [open, setOpen] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const syncFromMonitor = React.useCallback(async () => {
    const chatId = settings.telegramChatId?.trim();
    if (!chatId) return;
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/jobs/monitor-sync?chatId=${encodeURIComponent(chatId)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      const apps = json.applications ?? [];
      if (apps.length > 0) {
        mergeMonitor(apps);
        setMsg(`Подтянуто ${apps.length} из бота`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  }, [settings.telegramChatId, mergeMonitor]);

  React.useEffect(() => {
    if (!settings.telegramChatId?.trim()) return;
    void syncFromMonitor();
    const t = setInterval(() => void syncFromMonitor(), 5 * 60_000);
    return () => clearInterval(t);
  }, [settings.telegramChatId, syncFromMonitor]);

  return (
    <div className="border-t pt-3 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:text-foreground"
      >
        {open ? "▾" : "▸"} Бот @search_jooobbb_bot
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          <p>
            Если монитор SearchJob запущен и настроен секрет — после кнопки «✅ Отправила»
            вакансия сама появится здесь (раз в несколько минут или по кнопке ниже).
            «⏭ Не буду» → статус «Игнор».
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={settings.telegramChatId ?? ""}
              onChange={(e) => setSettings({ telegramChatId: e.target.value })}
              placeholder="Chat ID из SearchJob .env"
              className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => void syncFromMonitor()}
              disabled={syncing || !settings.telegramChatId?.trim()}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 hover:bg-muted disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Обновить сейчас
            </button>
          </div>
          {msg ? <p>{msg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
