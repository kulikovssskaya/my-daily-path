"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
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
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    void isRizeConfigured().then(setConfigured);
  }, []);

  const runSync = React.useCallback(async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await syncRizeToCalendar(168);
      if (!result.ok) {
        setMessage(result.error ?? "Sync failed");
        return;
      }
      setMessage(formatRizeSyncMessage(result));
    } finally {
      setSyncing(false);
    }
  }, []);

  if (configured === false) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm",
        className
      )}
    >
      <span className="text-muted-foreground">
        Rize{configured === null ? "…" : ""}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        disabled={syncing || configured !== true}
        onClick={() => void runSync()}
      >
        <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
        Sync from Rize
      </Button>
      <span className="text-xs text-muted-foreground">
        Adds new blocks only — edits and deletes are kept
      </span>
      {message && (
        <span className="max-w-xl text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
