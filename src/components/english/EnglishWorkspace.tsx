"use client";

import * as React from "react";
import {
  Sparkles,
  Loader2,
  Flame,
  BookOpen,
  Settings2,
  RotateCcw,
  Star,
  Check,
  ChevronRight,
} from "lucide-react";
import { useEnglishStore } from "@/stores/englishStore";
import { postAI } from "@/lib/aiClient";
import type { EnglishVocabDrop } from "@/lib/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMounted } from "@/hooks/useMounted";
import {
  ALL_ENGLISH_CATEGORIES,
  ENGLISH_CATEGORY_LABELS,
} from "@/lib/englishConstants";
import { todayDateKey, isDueForReview } from "@/lib/englishSrs";
import { FlashcardPanel } from "./FlashcardPanel";
import { QuizPanel } from "./QuizPanel";
import { FinalReviewPanel } from "./FinalReviewPanel";
import type { EnglishCategory, EnglishVocabWord } from "@/types";
import { cn } from "@/lib/utils";
import { collectKnownTerms } from "@/lib/englishVocabMix";

function StatsBar() {
  const stats = useEnglishStore((s) => s.stats);
  const dueCount = useEnglishStore(
    (s) => Object.values(s.srs).filter((r) => isDueForReview(r)).length
  );
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Flame className="size-8 text-orange-500" />
          <div>
            <p className="text-2xl font-bold">{stats.streak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <BookOpen className="size-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{stats.totalWordsLearned}</p>
            <p className="text-xs text-muted-foreground">words studied</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Check className="size-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold">{stats.averageScore}%</p>
            <p className="text-xs text-muted-foreground">avg score</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <RotateCcw className="size-8 text-amber-600" />
          <div>
            <p className="text-2xl font-bold">{dueCount}</p>
            <p className="text-xs text-muted-foreground">due for review</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel() {
  const settings = useEnglishStore((s) => s.settings);
  const updateSettings = useEnglishStore((s) => s.updateSettings);
  const [open, setOpen] = React.useState(false);

  const toggleCategory = (cat: EnglishCategory) => {
    const set = new Set(settings.focusCategories);
    if (set.has(cat)) {
      if (set.size <= 1) return;
      set.delete(cat);
    } else {
      set.add(cat);
    }
    updateSettings({ focusCategories: [...set] });
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Settings
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Learning settings</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Words per day
          </label>
          <input
            type="number"
            min={5}
            max={15}
            value={settings.dailyWordCount}
            onChange={(e) =>
              updateSettings({ dailyWordCount: Number(e.target.value) || 10 })
            }
            className="mt-1 w-24 rounded-lg border bg-background px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Drop pool size (AI generates)
          </label>
          <input
            type="number"
            min={20}
            max={30}
            value={settings.dropPoolSize}
            onChange={(e) =>
              updateSettings({ dropPoolSize: Number(e.target.value) || 20 })
            }
            className="mt-1 w-24 rounded-lg border bg-background px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Level
          </label>
          <select
            value={settings.level}
            onChange={(e) =>
              updateSettings({ level: e.target.value as "B1" | "B1-B2" })
            }
            className="mt-1 rounded-lg border bg-background px-2 py-1"
          >
            <option value="B1">B1</option>
            <option value="B1-B2">B1–B2</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Focus categories (at least one)
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_ENGLISH_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  settings.focusCategories.includes(cat)
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {ENGLISH_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WordCard({
  word,
  selected,
  onToggle,
}: {
  word: EnglishVocabWord;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{word.term}</p>
          <p className="text-sm text-muted-foreground">{word.translationRu}</p>
        </div>
        <Star
          className={cn(
            "size-4 shrink-0",
            selected ? "fill-primary text-primary" : "text-muted-foreground"
          )}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{word.definition}</p>
      <p className="mt-1 text-xs italic">&ldquo;{word.example}&rdquo;</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          {ENGLISH_CATEGORY_LABELS[word.category]}
        </span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          {word.difficulty}
        </span>
      </div>
    </button>
  );
}

function VocabularyDropPanel() {
  const settings = useEnglishStore((s) => s.settings);
  const vocabulary = useEnglishStore((s) => s.vocabulary);
  const history = useEnglishStore((s) => s.history);
  const activeSession = useEnglishStore((s) => s.activeSession);
  const applyVocabDrop = useEnglishStore((s) => s.applyVocabDrop);
  const toggleSelectWord = useEnglishStore((s) => s.toggleSelectWord);
  const confirmSelection = useEnglishStore((s) => s.confirmSelection);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectError, setSelectError] = React.useState<string | null>(null);
  const [syncHint, setSyncHint] = React.useState(false);

  const dropWords = (activeSession?.dropWordIds ?? [])
    .map((id) => vocabulary.find((w) => w.id === id))
    .filter(Boolean) as EnglishVocabWord[];

  const selectedCount = activeSession?.selectedWordIds.length ?? 0;

  const generateDrop = async () => {
    setLoading(true);
    setError(null);
    setSyncHint(false);
    try {
      const res = await postAI<{
        data: EnglishVocabDrop;
        needsKey?: boolean;
        usedFallback?: boolean;
      }>("/api/ai/english-vocab", {
        poolSize: Math.max(20, settings.dropPoolSize || 20),
        level: settings.level,
        knownTerms: collectKnownTerms(vocabulary, history),
      });
      applyVocabDrop(res.data);
      if (res.needsKey) {
        setSyncHint(true);
        window.dispatchEvent(new Event("mdp-open-sync-setup"));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate vocabulary.";
      setError(msg);
      if (/sync code|needsKey/i.test(msg)) {
        setSyncHint(true);
        window.dispatchEvent(new Event("mdp-open-sync-setup"));
      }
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = () => {
    const r = confirmSelection();
    if (!r.ok) setSelectError(r.error ?? "Selection error");
    else setSelectError(null);
  };

  if (!activeSession || activeSession.phase === "select") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Daily Vocabulary Drop</CardTitle>
          <p className="text-sm text-muted-foreground">
            AI generates {settings.dropPoolSize} fresh words — 50% everyday life, 50%
            ML/IT. Pick exactly {settings.dailyWordCount} for today.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {dropWords.length === 0 ? (
            <Button onClick={generateDrop} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate today&apos;s vocabulary
            </Button>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Selected {selectedCount} / {settings.dailyWordCount}
                </p>
                <Progress
                  value={
                    settings.dailyWordCount > 0
                      ? (selectedCount / settings.dailyWordCount) * 100
                      : 0
                  }
                  className="max-w-[120px]"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {dropWords.map((w) => (
                  <WordCard
                    key={w.id}
                    word={w}
                    selected={activeSession?.selectedWordIds.includes(w.id) ?? false}
                    onToggle={() => toggleSelectWord(w.id)}
                  />
                ))}
              </div>
              {selectError && (
                <p className="text-sm text-destructive">{selectError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={onConfirm} disabled={selectedCount !== settings.dailyWordCount}>
                  Start learning session
                  <ChevronRight className="size-4" />
                </Button>
                <Button variant="outline" onClick={generateDrop} disabled={loading}>
                  Regenerate drop
                </Button>
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {syncHint && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Enable Sync in the sidebar and enter your personal code for fresh AI words.
              A local 20-word pack (10 everyday + 10 ML/IT) is used until then.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}

function SessionCompletePanel() {
  const session = useEnglishStore((s) => s.activeSession);
  const quizQuestions = useEnglishStore((s) => s.quizQuestions);
  const resetTodaySession = useEnglishStore((s) => s.resetTodaySession);
  if (!session || session.phase !== "complete") return null;

  const wordCount = session.selectedWordIds.length;
  const reviewCorrect = Object.values(session.reviewAnswers ?? {}).filter(Boolean).length;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">Session complete</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-3xl font-bold">{session.finalScore ?? 0}%</p>
        <p className="text-sm text-muted-foreground">
          Final review {reviewCorrect}/{wordCount}
        </p>
        <p className="text-xs text-muted-foreground">
          Practice (not scored): Matching {session.matchingCorrect}/{wordCount} · Quiz{" "}
          {session.quizCorrect}/{quizQuestions.length}
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {(session.recommendations ?? []).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <Button onClick={resetTodaySession}>Start a new session tomorrow</Button>
      </CardContent>
    </Card>
  );
}

function PhaseSteps() {
  const phase = useEnglishStore((s) => s.activeSession?.phase);
  const steps = [
    { key: "select", label: "Vocabulary" },
    { key: "flashcards", label: "Study list" },
    { key: "quiz", label: "Practice" },
    { key: "review", label: "Final test" },
    { key: "complete", label: "Done" },
  ];
  const idx = steps.findIndex((s) => s.key === phase);

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {steps.map((s, i) => (
        <span
          key={s.key}
          className={cn(
            "rounded-full px-2.5 py-1",
            i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {i + 1}. {s.label}
        </span>
      ))}
    </div>
  );
}

export function EnglishWorkspace() {
  const mounted = useMounted();
  const phase = useEnglishStore((s) => s.activeSession?.phase);
  const activeSession = useEnglishStore((s) => s.activeSession);
  const history = useEnglishStore((s) => s.history);
  const ensureHistoryBackfill = useEnglishStore((s) => s.ensureHistoryBackfill);
  const expireStaleSession = useEnglishStore((s) => s.expireStaleSession);
  const today = todayDateKey();

  React.useEffect(() => {
    expireStaleSession();
    ensureHistoryBackfill();
  }, [ensureHistoryBackfill, expireStaleSession]);

  if (!mounted) {
    return <div className="h-64 animate-pulse rounded-xl border bg-card" />;
  }

  const todayDone = history.some((h) => h.dateKey === today);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">English Boost</h2>
          <p className="text-sm text-muted-foreground">
            B1-B2 daily practice: 10 words, flashcards, quizzes, spaced repetition
          </p>
        </div>
        <SettingsPanel />
      </div>

      <StatsBar />

      {todayDone && !activeSession && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            You already completed today&apos;s session. Great job! Come back tomorrow
            for a new vocabulary drop.
          </CardContent>
        </Card>
      )}

      {activeSession && <PhaseSteps />}

      <VocabularyDropPanel />

      {phase === "flashcards" && <FlashcardPanel />}

      {phase === "quiz" && <QuizPanel />}

      {phase === "review" && <FinalReviewPanel />}

      <SessionCompletePanel />

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {history.slice(0, 7).map((h) => (
                <li
                  key={h.id}
                  className="flex justify-between border-b border-border/50 py-2 last:border-0"
                >
                  <span>{h.dateKey}</span>
                  <span className="font-medium">{h.finalScore}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
