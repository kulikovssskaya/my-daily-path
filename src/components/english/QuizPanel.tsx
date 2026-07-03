"use client";

import * as React from "react";
import { useEnglishStore } from "@/stores/englishStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuizPanel() {
  const session = useEnglishStore((s) => s.activeSession);
  const quizQuestions = useEnglishStore((s) => s.quizQuestions);
  const answerQuiz = useEnglishStore((s) => s.answerQuiz);
  const nextQuiz = useEnglishStore((s) => s.nextQuiz);
  const vocabulary = useEnglishStore((s) => s.vocabulary);

  const [selected, setSelected] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<"correct" | "wrong" | null>(null);
  const [showMatching, setShowMatching] = React.useState(true);
  const [matched, setMatched] = React.useState<Set<string>>(new Set());
  const [pickedTerm, setPickedTerm] = React.useState<string | null>(null);

  const progress = session?.quizProgress ?? 0;
  const q = quizQuestions[progress];
  const startQuiz = useEnglishStore((s) => s.startQuiz);

  React.useEffect(() => {
    if (session?.phase === "quiz" && quizQuestions.length === 0) {
      startQuiz();
    }
  }, [session?.phase, quizQuestions.length, startQuiz]);

  const words = (session?.selectedWordIds ?? [])
    .map((id) => vocabulary.find((w) => w.id === id))
    .filter(Boolean);

  const terms = words.map((w) => w!);
  const shuffledRu = React.useMemo(
    () => [...terms].sort(() => Math.random() - 0.5),
    [session?.id, terms.map((t) => t.id).join(",")]
  );

  const submitAnswer = (answer: string) => {
    if (!q) return;
    const ok = answerQuiz(q.id, answer);
    setFeedback(ok ? "correct" : "wrong");
    setSelected(answer);
  };

  const goNext = () => {
    setSelected(null);
    setFeedback(null);
    if (progress + 1 >= quizQuestions.length) {
      nextQuiz();
    }
  };

  if (!session) return null;

  if (showMatching && terms.length > 0) {
    const tryMatch = (wordId: string, translation: string) => {
      const word = terms.find((w) => w.id === wordId);
      if (word && word.translationRu === translation) {
        setMatched((m) => new Set(m).add(wordId));
        setPickedTerm(null);
      } else {
        setPickedTerm(null);
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2B. Practice — Matching</CardTitle>
          <p className="text-sm text-muted-foreground">
            Match English terms with Russian translations ({matched.size}/{terms.length})
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            {terms.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={matched.has(w.id)}
                onClick={() => setPickedTerm(w.id)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-sm",
                  matched.has(w.id) && "bg-green-500/10 line-through opacity-60",
                  pickedTerm === w.id && "border-primary ring-1 ring-primary"
                )}
              >
                {w.term}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {shuffledRu.map((w) => (
              <button
                key={w.id + "-ru"}
                type="button"
                disabled={matched.has(w.id)}
                onClick={() => {
                  if (pickedTerm) tryMatch(pickedTerm, w.translationRu);
                }}
                className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                {w.translationRu}
              </button>
            ))}
          </div>
          {matched.size >= terms.length && (
            <Button className="sm:col-span-2" onClick={() => setShowMatching(false)}>
              Continue to quiz questions
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!q) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Button onClick={() => nextQuiz()}>Go to final review</Button>
        </CardContent>
      </Card>
    );
  }

  const typeLabel =
    q.type === "multiple_choice"
      ? "Multiple choice"
      : q.type === "fill_blank"
        ? "Fill in the blank"
        : "Question";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          2B. Practice — {typeLabel} ({progress + 1}/{quizQuestions.length})
        </CardTitle>
        <p className="text-sm">{q.prompt}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {(q.options ?? []).map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={feedback !== null}
            onClick={() => submitAnswer(opt)}
            className={cn(
              "block w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              selected === opt &&
                feedback === "correct" &&
                "border-green-500 bg-green-500/10",
              selected === opt && feedback === "wrong" && "border-destructive bg-destructive/10",
              selected !== opt && feedback === null && "hover:bg-muted/50"
            )}
          >
            {opt}
          </button>
        ))}
        {feedback && (
          <div className="space-y-2 pt-2">
            <p
              className={cn(
                "text-sm font-medium",
                feedback === "correct" ? "text-green-600" : "text-destructive"
              )}
            >
              {feedback === "correct" ? "Correct!" : `Correct answer: ${q.correctAnswer}`}
            </p>
            <Button onClick={goNext}>
              {progress + 1 >= quizQuestions.length ? "Final review" : "Next question"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
