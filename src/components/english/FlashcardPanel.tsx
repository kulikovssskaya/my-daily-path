"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { useEnglishStore } from "@/stores/englishStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ENGLISH_CATEGORY_LABELS } from "@/lib/englishConstants";
import type { EnglishVocabWord } from "@/types";

function StudyWordRow({
  word,
  index,
  onExampleChange,
}: {
  word: EnglishVocabWord;
  index: number;
  onExampleChange: (example: string) => void;
}) {
  const [exampleDraft, setExampleDraft] = React.useState(word.userExample ?? "");

  React.useEffect(() => {
    setExampleDraft(word.userExample ?? "");
  }, [word.id, word.userExample]);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold">{word.term}</p>
              <p className="text-base font-medium text-primary">{word.translationRu}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {ENGLISH_CATEGORY_LABELS[word.category]}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {word.difficulty}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{word.definition}</p>
          <p className="text-sm italic">&ldquo;{word.example}&rdquo;</p>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Your example (optional)
            </label>
            <textarea
              value={exampleDraft}
              onChange={(e) => {
                setExampleDraft(e.target.value);
                onExampleChange(e.target.value);
              }}
              rows={2}
              placeholder="Write your own sentence..."
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlashcardPanel() {
  const session = useEnglishStore((s) => s.activeSession);
  const getSessionWords = useEnglishStore((s) => s.getSessionWords);
  const finishStudyCard = useEnglishStore((s) => s.finishStudyCard);
  const setUserExample = useEnglishStore((s) => s.setUserExample);

  const words = getSessionWords();
  const total = words.length;

  if (!session || session.phase !== "flashcards" || total === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">2A. Study list ({total} words)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Read through all words below. Add your own examples if you like, then continue to
          practice.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {words.map((word, index) => (
          <StudyWordRow
            key={word.id}
            word={word}
            index={index}
            onExampleChange={(example) => setUserExample(word.id, example)}
          />
        ))}

        <div className="flex justify-end border-t pt-4">
          <Button onClick={() => finishStudyCard()}>
            Continue to practice
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
