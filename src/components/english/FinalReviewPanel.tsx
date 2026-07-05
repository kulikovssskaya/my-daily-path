"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { useEnglishStore } from "@/stores/englishStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { matchesFinalReviewAnswer } from "@/lib/englishAnswerMatch";
import { cn } from "@/lib/utils";

export function FinalReviewPanel() {
  const session = useEnglishStore((s) => s.activeSession);
  const getSessionWords = useEnglishStore((s) => s.getSessionWords);
  const submitFinalReview = useEnglishStore((s) => s.submitFinalReview);

  const words = getSessionWords();
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [draft, setDraft] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [wasCorrect, setWasCorrect] = React.useState(false);

  const word = words[index];
  const total = words.length;

  React.useEffect(() => {
    setDraft("");
    setChecked(false);
    setWasCorrect(false);
  }, [index, word?.id]);

  if (!session || session.phase !== "review" || !word) return null;

  const handleCheck = () => {
    if (!draft.trim() || checked) return;
    const ok = matchesFinalReviewAnswer(draft, word.term, word.translationRu);
    setAnswers((a) => ({ ...a, [word.id]: draft.trim() }));
    setWasCorrect(ok);
    setChecked(true);
  };

  const handleNext = () => {
    if (!checked) return;
    const allAnswers = { ...answers, [word.id]: draft.trim() };
    if (index + 1 >= total) {
      submitFinalReview(allAnswers);
      return;
    }
    setAnswers(allAnswers);
    setIndex((i) => i + 1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          2C. Final Review ({index + 1} / {total})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Type the Russian translation or the English term (case and approximate
          wording are OK).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-2xl font-bold">{word.term}</p>

        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (checked) handleNext();
              else handleCheck();
            }
          }}
          disabled={checked}
          placeholder="Your answer..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />

        {!checked ? (
          <Button onClick={handleCheck} disabled={!draft.trim()}>
            Check
          </Button>
        ) : (
          <div className="space-y-3">
            <p
              className={cn(
                "text-sm font-medium",
                wasCorrect ? "text-green-600" : "text-destructive"
              )}
            >
              {wasCorrect ? "Correct!" : "Not quite."}
            </p>
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Correct answer</p>
              <p className="mt-1 font-medium">{word.translationRu}</p>
              <p className="mt-1 text-muted-foreground">{word.term}</p>
            </div>
            <Button onClick={handleNext}>
              {index + 1 >= total ? "See results" : "Next"}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
