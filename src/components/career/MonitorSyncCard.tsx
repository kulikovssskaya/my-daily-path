"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";

const DEFAULT_CHAT =
  typeof process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID === "string"
    ? process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID.trim()
    : "";

const SYNC_SINCE =
  typeof process.env.NEXT_PUBLIC_MONITOR_SYNC_SINCE === "string" &&
  process.env.NEXT_PUBLIC_MONITOR_SYNC_SINCE.trim()
    ? process.env.NEXT_PUBLIC_MONITOR_SYNC_SINCE.trim()
    : "2026-09-16";

/** Quiet auto-sync from SearchJob bot after “Отправила” (since SYNC_SINCE only). */
export function MonitorSyncCard() {
  const settings = useCareerStore((s) => s.jobTrackerSettings);
  const setSettings = useCareerStore((s) => s.setJobTrackerSettings);
  const syncMonitor = useCareerStore((s) => s.syncMonitorApplications);
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
      const since = typeof json.since === "string" ? json.since : SYNC_SINCE;
      syncMonitor(apps, since);
      setMsg(
        apps.length > 0
          ? `Synced ${apps.length} from bot (since ${since})`
          : `Cleared older bot imports · tracking since ${since}`
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync error");
    } finally {
      setSyncing(false);
    }
  }, [chatId, syncMonitor]);

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
            After <strong>✅ Отправила</strong> in the bot, the job appears here within ~1
            minute. Only applications from <strong>{SYNC_SINCE}</strong> onward are kept.
            Older bot history is ignored.
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
