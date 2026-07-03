"use client";

import * as React from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  syncRizeToCalendar,
  isRizeConfigured,
  formatRizeSyncMessage,
} from "@/lib/integrations/rizeSyncClient";
import { cn } from "@/lib/utils";

export function RizeSyncBar({ className }: { className?: string }) {
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    void isRizeConfigured().then(setConfigured);
  }, []);

  const runSync = React.useCallback(async (opts?: { silent?: boolean; generate?: boolean }) => {
    const silent = opts?.silent ?? false;
    const generate = opts?.generate ?? false;
    if (generate) setGenerating(true);
    else setSyncing(true);
    if (!silent) setMessage(generate ? "Generating from Rize activity…" : null);
    try {
      const result = await syncRizeToCalendar(168, generate);
      if (!result.ok) {
        if (!silent) setMessage(result.error ?? "Sync failed");
        return;
      }
      const msg = formatRizeSyncMessage(result);
      if (!silent || result.added + result.updated > 0 || result.count === 0) {
        setMessage(msg);
      }
    } finally {
      setSyncing(false);
      setGenerating(false);
    }
  }, []);

  React.useEffect(() => {
    if (configured !== true) return;
    void runSync({ silent: true });
  }, [configured, runSync]);

  if (configured === false) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm",
        className
      )}
    >
      <span className="text-muted-foreground">
        Rize → calendar{configured === null ? "…" : ""}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        disabled={syncing || generating || configured !== true}
        onClick={() => void runSync({ generate: false })}
      >
        <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
        Sync now
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        disabled={syncing || generating || configured !== true}
        onClick={() => void runSync({ generate: true })}
        title="Ask Rize AI to build time entries from tracked apps, then sync"
      >
        <Sparkles className={cn("size-3.5", generating && "animate-pulse")} />
        Generate
      </Button>
      {message && (
        <span className="max-w-xl text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
