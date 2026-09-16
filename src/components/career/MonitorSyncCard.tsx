"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";

const DEFAULT_CHAT =
  typeof process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID === "string"
    ? process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID.trim()
    : "";

/** Quiet auto-sync from SearchJob bot after “Отправила”. */
export function MonitorSyncCard() {
  const settings = useCareerStore((s) => s.jobTrackerSettings);
  const setSettings = useCareerStore((s) => s.setJobTrackerSettings);
  const mergeMonitor = useCareerStore((s) => s.mergeMonitorApplications);
  const [open, setOpen] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!settings.telegramChatId?.trim() && DEFAULT_CHAT) {
      setSettings({ telegramChatId: DEFAULT_CHAT });
    }
  }, [settings.telegramChatId, setSettings]);

  const chatId = settings.telegramChatId?.trim() || DEFAULT_CHAT;

  const syncFromMonitor = React.useCallback(async () => {
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
        setMsg(`Synced ${apps.length} from bot`);
      } else {
        setMsg("No new items from bot yet");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync error");
    } finally {
      setSyncing(false);
    }
  }, [chatId, mergeMonitor]);

  React.useEffect(() => {
    if (!chatId) return;
    void syncFromMonitor();
    const t = setInterval(() => void syncFromMonitor(), 60_000);
    return () => clearInterval(t);
  }, [chatId, syncFromMonitor]);

  return (
    <div className="border-t pt-3 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:text-foreground"
      >
        {open ? "▾" : "▸"} Bot @search_jooobbb_bot
        {syncing ? " · syncing…" : ""}
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          <p>
            After you tap <strong>✅ Отправила</strong> in the bot (with SearchJob monitor
            running), the job appears here within ~1 minute. <strong>⏭ Не буду</strong> →
            Ignored.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={settings.telegramChatId ?? DEFAULT_CHAT}
              onChange={(e) => setSettings({ telegramChatId: e.target.value })}
              placeholder="Telegram Chat ID"
              className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => void syncFromMonitor()}
              disabled={syncing || !chatId}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 hover:bg-muted disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Sync now
            </button>
          </div>
          {msg ? <p>{msg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
