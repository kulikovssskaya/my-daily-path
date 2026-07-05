"use client";

import * as React from "react";
import { Sparkles, Loader2, Info, WifiOff, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePlanner } from "./usePlanner";
import { cn } from "@/lib/utils";

const EXAMPLE = `Plan for tomorrow

09:00–09:20 Wake up, water, wash up
09:20–09:40 Morning exercise (15 min): neck (1 min), gua sha (2 min), eye gymnastics (2 min)
09:40–10:20 Go grocery shopping
10:20–11:00 Cook breakfast + something for lunch/dinner
11:00–11:30 Breakfast
11:30–13:30 Big ML learning block (2h): 30 min theory, 60 min practice, 30 min notes + save questions. Focus: CatBoost/LightGBM, cross-validation, class imbalance, A/B tests
13:30–13:40 10 min break
13:40–15:00 Set up work system: connect Cursor + Claude, learn basic workflow, configure workspace
15:00–15:30 Lunch
15:30–16:30 Work plan: ML learning, job applications, resume review, task structure
16:30–18:00 Planning app + flashcards app: define features, screens/structure, first MVP
18:00–18:20 Vocals
18:20–18:40 10 English words
18:40–19:10 Dinner
19:10–19:30 Reading
19:30–20:00 Ball massage + free rest`;

export function NaturalInput() {
  const [value, setValue] = React.useState("");
  const { run, loading, error, last } = usePlanner();

  const onSubmit = async () => {
    const result = await run(value);
    if (result) setValue("");
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          Describe your day in your own words
        </label>
        <p className="text-xs text-muted-foreground">
          To fix a specific day, pick it below and edit — or describe a plan for today / ahead.
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
          }}
          rows={5}
          placeholder="e.g. Morning: English 1h, then work on the project. Evening: workout. Tomorrow: finish Python module 3. Type «undo» or «удали последнее» to revert."
          className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setValue(EXAMPLE)}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Insert example
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Ctrl/⌘ + Enter
            </span>
            <Button onClick={onSubmit} disabled={loading || !value.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {loading ? "Building plan..." : "Generate / Update plan"}
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {last?.reasoning && (
          <details className="rounded-lg border bg-muted/40 px-3 py-2 text-sm" open>
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
              <Brain className="size-3.5 text-primary" />
              AI reasoning
            </summary>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{last.reasoning}</p>
          </details>
        )}

        {last && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
              last.usedFallback
                ? "bg-secondary text-secondary-foreground"
                : "bg-primary/10 text-foreground"
            )}
          >
            {last.usedFallback ? (
              <WifiOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : (
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            )}
            <span>{last.summary}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
