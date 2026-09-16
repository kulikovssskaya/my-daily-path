"use client";

import * as React from "react";
import { Database, Loader2, RefreshCw } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MonitorSyncCard() {
  const settings = useCareerStore((s) => s.jobTrackerSettings);
  const setSettings = useCareerStore((s) => s.setJobTrackerSettings);
  const mergeMonitor = useCareerStore((s) => s.mergeMonitorApplications);
  const [syncing, setSyncing] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const syncFromMonitor = React.useCallback(async () => {
    const chatId = settings.telegramChatId?.trim();
    if (!chatId) {
      setMsg("Укажите Telegram Chat ID (тот же, что в SearchJob .env)");
      return;
    }
    setSyncing(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/jobs/monitor-sync?chatId=${encodeURIComponent(chatId)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sync failed");
      const apps = json.applications ?? [];
      if (apps.length === 0) {
        setMsg("Пока нет данных от SearchJob. Нажми «Отправила» в боте — запись появится автоматически.");
        return;
      }
      mergeMonitor(apps);
      setMsg(`Синхронизировано ${apps.length} откликов из SearchJob`);
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
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Database className="size-4" />
        </span>
        <CardTitle className="text-sm">SearchJob → трекер</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Бот <strong>@search_jooobbb_bot</strong> управляется проектом SearchJob. Когда ты
          нажимаешь <strong>«✅ Отправила»</strong>, отклик автоматически попадает сюда
          (название, компания, ссылка, статус). Кнопка <strong>«⏭ Не буду»</strong> → статус
          «Игнор».
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={settings.telegramChatId ?? ""}
            onChange={(e) => setSettings({ telegramChatId: e.target.value })}
            placeholder="Telegram Chat ID (из SearchJob .env)"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void syncFromMonitor()}
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
        {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
        <p className="text-[11px] text-muted-foreground/80">
          Отклики вне бота (LinkedIn, hh.ru, Telegram HR) — вставь ссылку в форму выше.
          Один трекер для всего.
        </p>
      </CardContent>
    </Card>
  );
}
