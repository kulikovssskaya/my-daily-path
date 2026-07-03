"use client";

import * as React from "react";
import { useEnglishStore } from "@/stores/englishStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FinalReviewPanel() {
  const getSessionWords = useEnglishStore((s) => s.getSessionWords);
  const submitFinalReview = useEnglishStore((s) => s.submitFinalReview);

  const words = getSessionWords();
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = () => {
    submitFinalReview(answers);
    setSubmitted(true);
  };

  if (submitted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">2C. Final Review</CardTitle>
        <p className="text-sm text-muted-foreground">
          Type the Russian translation or the English term for each word.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {words.map((w) => (
          <div key={w.id} className="space-y-1">
            <label className="text-sm font-medium">{w.term}</label>
            <input
              type="text"
              value={answers[w.id] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [w.id]: e.target.value }))
              }
              placeholder="Translation or term..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        ))}
        <Button
          onClick={handleSubmit}
          disabled={words.some((w) => !(answers[w.id] ?? "").trim())}
        >
          Submit final test
        </Button>
      </CardContent>
    </Card>
  );
}
