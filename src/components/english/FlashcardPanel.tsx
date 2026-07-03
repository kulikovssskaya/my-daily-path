"use client";

import * as React from "react";
import { RotateCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEnglishStore } from "@/stores/englishStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ENGLISH_CATEGORY_LABELS } from "@/lib/englishConstants";

export function FlashcardPanel() {
  const session = useEnglishStore((s) => s.activeSession);
  const getSessionWords = useEnglishStore((s) => s.getSessionWords);
  const rateFlashcard = useEnglishStore((s) => s.rateFlashcard);
  const nextFlashcard = useEnglishStore((s) => s.nextFlashcard);
  const setUserExample = useEnglishStore((s) => s.setUserExample);
  const vocabulary = useEnglishStore((s) => s.vocabulary);

  const [flipped, setFlipped] = React.useState(false);
  const [exampleDraft, setExampleDraft] = React.useState("");
  const [rated, setRated] = React.useState(false);

  const words = getSessionWords();
  const index = session?.flashcardIndex ?? 0;
  const wordId = session?.selectedWordIds[index];
  const word = wordId ? vocabulary.find((w) => w.id === wordId) : undefined;

  React.useEffect(() => {
    setFlipped(false);
    setRated(false);
    setExampleDraft(word?.userExample ?? "");
  }, [wordId, word?.userExample]);

  if (!session || !word) return null;

  const total = session.selectedWordIds.length;

  const handleRate = (result: "know" | "unknown") => {
    rateFlashcard(word.id, result);
    setRated(true);
  };

  const handleNext = () => {
    if (exampleDraft.trim()) setUserExample(word.id, exampleDraft);
    nextFlashcard();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          2A. Flashcards ({index + 1} / {total})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="mx-auto flex min-h-[220px] w-full max-w-lg flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6 text-center transition-transform hover:scale-[1.01]"
        >
          {!flipped ? (
            <>
              <p className="text-2xl font-bold">{word.term}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {ENGLISH_CATEGORY_LABELS[word.category]} · {word.difficulty}
              </p>
              <p className="mt-4 text-xs text-primary">Tap to flip</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-primary">{word.translationRu}</p>
              <p className="mt-3 text-sm">{word.definition}</p>
              <p className="mt-2 text-sm italic text-muted-foreground">
                &ldquo;{word.example}&rdquo;
              </p>
            </>
          )}
        </button>

        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}>
            <RotateCw className="size-4" />
            Flip
          </Button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Your example (optional)
          </label>
          <textarea
            value={exampleDraft}
            onChange={(e) => setExampleDraft(e.target.value)}
            rows={2}
            placeholder="Write your own sentence with this word..."
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleRate("unknown")}
            disabled={rated}
          >
            <ThumbsDown className="size-4" />
            Don&apos;t know
          </Button>
          <Button onClick={() => handleRate("know")} disabled={rated}>
            <ThumbsUp className="size-4" />
            Know it
          </Button>
        </div>

        {rated && (
          <div className="flex justify-center">
            <Button onClick={handleNext}>
              {index + 1 >= total ? "Continue to practice" : "Next card"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
