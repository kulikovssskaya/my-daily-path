"use client";

import * as React from "react";
import { ChevronRight, RotateCw } from "lucide-react";
import { useEnglishStore } from "@/stores/englishStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ENGLISH_CATEGORY_LABELS } from "@/lib/englishConstants";

export function FlashcardPanel() {
  const session = useEnglishStore((s) => s.activeSession);
  const getSessionWords = useEnglishStore((s) => s.getSessionWords);
  const finishStudyCard = useEnglishStore((s) => s.finishStudyCard);

  const [flipped, setFlipped] = React.useState(false);
  const words = getSessionWords();

  if (!session || words.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          2A. Study card — {words.length} words
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          All today&apos;s words on one card. Flip to see translations and examples.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 text-left transition-transform hover:scale-[1.005]"
        >
          {!flipped ? (
            <ul className="space-y-3">
              {words.map((w, i) => (
                <li
                  key={w.id}
                  className="flex items-baseline gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0"
                >
                  <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="flex-1 text-lg font-semibold">{w.term}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {ENGLISH_CATEGORY_LABELS[w.category]}
                  </span>
                </li>
              ))}
              <p className="pt-2 text-center text-xs text-primary">Tap to flip</p>
            </ul>
          ) : (
            <ul className="space-y-4">
              {words.map((w, i) => (
                <li
                  key={w.id}
                  className="border-b border-border/40 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">{i + 1}.</span>
                    <p className="font-semibold">{w.term}</p>
                    <span className="text-xs text-muted-foreground">· {w.difficulty}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-primary">{w.translationRu}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{w.definition}</p>
                  <p className="mt-1 text-sm italic">&ldquo;{w.example}&rdquo;</p>
                </li>
              ))}
            </ul>
          )}
        </button>

        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}>
            <RotateCw className="size-4" />
            Flip
          </Button>
          <Button onClick={() => finishStudyCard()}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
