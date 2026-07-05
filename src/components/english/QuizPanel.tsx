"use client";

import * as React from "react";
import { useEnglishStore } from "@/stores/englishStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { checkAnswer } from "@/lib/englishQuiz";

const PAIR_STYLES = [
  "bg-sky-500/20 border-sky-400 text-sky-950 dark:text-sky-100",
  "bg-violet-500/20 border-violet-400 text-violet-950 dark:text-violet-100",
  "bg-emerald-500/20 border-emerald-400 text-emerald-950 dark:text-emerald-100",
  "bg-amber-500/20 border-amber-400 text-amber-950 dark:text-amber-100",
  "bg-rose-500/20 border-rose-400 text-rose-950 dark:text-rose-100",
  "bg-cyan-500/20 border-cyan-400 text-cyan-950 dark:text-cyan-100",
  "bg-indigo-500/20 border-indigo-400 text-indigo-950 dark:text-indigo-100",
  "bg-lime-500/20 border-lime-400 text-lime-950 dark:text-lime-100",
  "bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-950 dark:text-fuchsia-100",
  "bg-orange-500/20 border-orange-400 text-orange-950 dark:text-orange-100",
];

export function QuizPanel() {
  const session = useEnglishStore((s) => s.activeSession);
  const quizQuestions = useEnglishStore((s) => s.quizQuestions);
  const answerQuiz = useEnglishStore((s) => s.answerQuiz);
  const nextQuiz = useEnglishStore((s) => s.nextQuiz);
  const startQuiz = useEnglishStore((s) => s.startQuiz);
  const vocabulary = useEnglishStore((s) => s.vocabulary);

  const [selected, setSelected] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<"correct" | "wrong" | null>(null);
  const [showMatching, setShowMatching] = React.useState(true);
  const [matched, setMatched] = React.useState<Set<string>>(new Set());
  const [pairStyle, setPairStyle] = React.useState<Record<string, number>>({});
  const [pickedTerm, setPickedTerm] = React.useState<string | null>(null);

  const progress = session?.quizProgress ?? 0;
  const q = quizQuestions[progress];

  React.useEffect(() => {
    if (session?.phase === "quiz" && quizQuestions.length === 0) {
      startQuiz();
    }
  }, [session?.phase, quizQuestions.length, startQuiz]);

  React.useEffect(() => {
    if (
      showMatching ||
      session?.phase !== "quiz" ||
      quizQuestions.length === 0 ||
      progress < quizQuestions.length
    ) {
      return;
    }
    const t = setTimeout(() => nextQuiz(), 300);
    return () => clearTimeout(t);
  }, [showMatching, session?.phase, progress, quizQuestions.length, nextQuiz]);

  const words = (session?.selectedWordIds ?? [])
    .map((id) => vocabulary.find((w) => w.id === id))
    .filter(Boolean);

  const terms = words.map((w) => w!);
  const shuffledRu = React.useMemo(
    () => [...terms].sort(() => Math.random() - 0.5),
    [session?.id, terms.map((t) => t.id).join(",")]
  );

  const submitAnswer = (answer: string) => {
    if (!q || feedback !== null) return;
    const ok = checkAnswer(q, answer);
    setFeedback(ok ? "correct" : "wrong");
    setSelected(answer);

    setTimeout(() => {
      answerQuiz(q.id, answer);
      setSelected(null);
      setFeedback(null);
    }, ok ? 400 : 700);
  };

  React.useEffect(() => {
    if (!showMatching || terms.length === 0) return;
    if (matched.size >= terms.length) {
      const t = setTimeout(() => setShowMatching(false), 500);
      return () => clearTimeout(t);
    }
  }, [matched.size, showMatching, terms.length]);

  if (!session) return null;

  const pairClass = (wordId: string, isActive?: boolean) => {
    const idx = pairStyle[wordId];
    if (idx !== undefined) {
      return cn(
        PAIR_STYLES[idx % PAIR_STYLES.length],
        "line-through opacity-80"
      );
    }
    if (isActive) return "border-primary ring-1 ring-primary";
    return "hover:bg-muted/50";
  };

  if (showMatching && terms.length > 0) {
    const tryMatch = (termId: string, ruId: string, translation: string) => {
      const word = terms.find((w) => w.id === termId);
      if (!word || termId !== ruId || word.translationRu !== translation) {
        setPickedTerm(null);
        return;
      }
      const colorIndex = matched.size;
      setMatched((m) => new Set(m).add(termId));
      setPairStyle((p) => ({ ...p, [termId]: colorIndex }));
      setPickedTerm(null);
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
                  "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  pairClass(w.id, pickedTerm === w.id)
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
                  if (pickedTerm) tryMatch(pickedTerm, w.id, w.translationRu);
                }}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  pairClass(w.id)
                )}
              >
                {w.translationRu}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!q) return null;

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
                "border-green-500 bg-green-500/15 line-through",
              selected === opt &&
                feedback === "wrong" &&
                "border-destructive bg-destructive/10",
              selected !== opt && feedback === null && "hover:bg-muted/50"
            )}
          >
            {opt}
          </button>
        ))}
        {feedback === "wrong" && (
          <p className="text-sm text-destructive">
            Correct answer: {q.correctAnswer}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
