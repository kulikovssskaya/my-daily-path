"use client";

import * as React from "react";
import { Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SyncKeySetup({
  onSaved,
  onCancel,
}: {
  onSaved: (key: string) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [key, setKey] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const save = React.useCallback(async () => {
    const trimmed = key.trim().replace(/^["']|["']$/g, "");
    if (trimmed.length < 8) {
      setError("Enter your sync code (at least 8 characters).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaved(trimmed);
    } catch {
      setError("Could not save — try again.");
    } finally {
      setSaving(false);
    }
  }, [key, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cloud className="size-5 text-primary" />
            Enable phone &amp; PC sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Enter your personal sync code once — it stays on this device. The same code
            unlocks cloud sync and AI features (English vocab, planner, etc.).
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
            placeholder="Your sync code"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoComplete="current-password"
          />
          {error && <p className="text-destructive">{error}</p>}
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="button"
              className="flex-1"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save & enable"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
