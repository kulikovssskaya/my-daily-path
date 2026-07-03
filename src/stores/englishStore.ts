import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  EnglishCategory,
  EnglishDailySession,
  EnglishDayRecord,
  EnglishSettings,
  EnglishStats,
  EnglishVocabWord,
  EnglishWordSRS,
} from "@/types";
import { uid } from "@/lib/utils";
import {
  advanceSRS,
  createInitialSRS,
  isDueForReview,
  scoreRecommendations,
  todayDateKey,
  updateStreak,
} from "@/lib/englishSrs";
import { aiWordToDomain } from "@/lib/englishConstants";
import { buildQuizQuestions, sessionScore } from "@/lib/englishQuiz";
import type { EnglishVocabDrop } from "@/lib/ai/schemas";

const DEFAULT_SETTINGS: EnglishSettings = {
  dailyWordCount: 10,
  dropPoolSize: 22,
  focusCategories: ["everyday", "it", "ml", "analytics", "phrasal", "idiom"],
  level: "B1-B2",
};

const DEFAULT_STATS: EnglishStats = {
  streak: 0,
  totalWordsLearned: 0,
  totalSessionsCompleted: 0,
  averageScore: 0,
};

interface EnglishState {
  settings: EnglishSettings;
  vocabulary: EnglishVocabWord[];
  favoriteWordIds: string[];
  activeSession: EnglishDailySession | null;
  srs: Record<string, EnglishWordSRS>;
  history: EnglishDayRecord[];
  stats: EnglishStats;
  quizQuestions: ReturnType<typeof buildQuizQuestions>;

  updateSettings: (patch: Partial<EnglishSettings>) => void;
  applyVocabDrop: (drop: EnglishVocabDrop) => void;
  toggleFavorite: (wordId: string) => void;
  toggleSelectWord: (wordId: string) => void;
  confirmSelection: () => { ok: boolean; error?: string };
  setUserExample: (wordId: string, example: string) => void;
  rateFlashcard: (wordId: string, result: "know" | "unknown") => void;
  nextFlashcard: () => void;
  startQuiz: () => void;
  answerQuiz: (questionId: string, answer: string) => boolean;
  nextQuiz: () => void;
  submitFinalReview: (answers: Record<string, string>) => { score: number; recommendations: string[] };
  getWord: (id: string) => EnglishVocabWord | undefined;
  getSessionWords: () => EnglishVocabWord[];
  getDueWords: () => EnglishVocabWord[];
  resetTodaySession: () => void;
}

function emptySession(dateKey: string, dropWordIds: string[]): EnglishDailySession {
  return {
    id: uid("sess"),
    dateKey,
    dropWordIds,
    selectedWordIds: [],
    phase: "select",
    flashcardIndex: 0,
    flashcardResults: {},
    quizProgress: 0,
    quizCorrect: 0,
    reviewAnswers: {},
  };
}

export const useEnglishStore = create<EnglishState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      vocabulary: [],
      favoriteWordIds: [],
      activeSession: null,
      srs: {},
      history: [],
      stats: DEFAULT_STATS,
      quizQuestions: [],

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      applyVocabDrop: (drop) => {
        const dateKey = todayDateKey();
        set((s) => {
          const vocabulary = [...s.vocabulary];
          const dropWords: EnglishVocabWord[] = [];
          for (const raw of drop.words) {
            const w = aiWordToDomain(raw);
            const existing = vocabulary.find(
              (v) => v.term.toLowerCase() === w.term.toLowerCase()
            );
            if (existing) {
              dropWords.push(existing);
            } else {
              vocabulary.push(w);
              dropWords.push(w);
            }
          }
          return {
            vocabulary,
            activeSession: emptySession(
              dateKey,
              dropWords.map((w) => w.id)
            ),
            favoriteWordIds: [],
          };
        });
      },

      toggleFavorite: (wordId) =>
        set((s) => {
          const fav = new Set(s.favoriteWordIds);
          if (fav.has(wordId)) fav.delete(wordId);
          else fav.add(wordId);
          const selected = new Set(s.activeSession?.selectedWordIds ?? []);
          if (fav.has(wordId)) selected.add(wordId);
          else selected.delete(wordId);
          return {
            favoriteWordIds: [...fav],
            activeSession: s.activeSession
              ? { ...s.activeSession, selectedWordIds: [...selected] }
              : null,
          };
        }),

      toggleSelectWord: (wordId) =>
        set((s) => {
          if (!s.activeSession) return s;
          const selected = new Set(s.activeSession.selectedWordIds);
          if (selected.has(wordId)) selected.delete(wordId);
          else selected.add(wordId);
          const fav = new Set(s.favoriteWordIds);
          if (selected.has(wordId)) fav.add(wordId);
          else fav.delete(wordId);
          return {
            favoriteWordIds: [...fav],
            activeSession: {
              ...s.activeSession,
              selectedWordIds: [...selected],
            },
          };
        }),

      confirmSelection: () => {
        const { activeSession, settings } = get();
        if (!activeSession) return { ok: false, error: "No active session." };
        const n = activeSession.selectedWordIds.length;
        if (n !== settings.dailyWordCount) {
          return {
            ok: false,
            error: `Select exactly ${settings.dailyWordCount} words (currently ${n}).`,
          };
        }
        set({
          activeSession: {
            ...activeSession,
            phase: "flashcards",
            flashcardIndex: 0,
            flashcardResults: {},
          },
        });
        return { ok: true };
      },

      setUserExample: (wordId, example) =>
        set((s) => ({
          vocabulary: s.vocabulary.map((w) =>
            w.id === wordId ? { ...w, userExample: example.trim() || undefined } : w
          ),
        })),

      rateFlashcard: (wordId, result) =>
        set((s) => {
          if (!s.activeSession) return s;
          const word = s.vocabulary.find((w) => w.id === wordId);
          const srs = { ...s.srs };
          if (word) {
            const existing = srs[wordId] ?? createInitialSRS(wordId, word.term);
            srs[wordId] = advanceSRS(existing, result === "know");
          }
          return {
            srs,
            activeSession: {
              ...s.activeSession,
              flashcardResults: {
                ...s.activeSession.flashcardResults,
                [wordId]: result,
              },
            },
          };
        }),

      nextFlashcard: () =>
        set((s) => {
          if (!s.activeSession) return s;
          const words = s.activeSession.selectedWordIds;
          const nextIndex = s.activeSession.flashcardIndex + 1;
          if (nextIndex >= words.length) {
            const sessionWords = words
              .map((id) => s.vocabulary.find((w) => w.id === id))
              .filter(Boolean) as EnglishVocabWord[];
            return {
              quizQuestions: buildQuizQuestions(sessionWords),
              activeSession: {
                ...s.activeSession,
                phase: "quiz",
                quizProgress: 0,
                quizCorrect: 0,
              },
            };
          }
          return {
            activeSession: { ...s.activeSession, flashcardIndex: nextIndex },
          };
        }),

      startQuiz: () =>
        set((s) => {
          const words = get().getSessionWords();
          return {
            quizQuestions: buildQuizQuestions(words),
            activeSession: s.activeSession
              ? { ...s.activeSession, phase: "quiz", quizProgress: 0, quizCorrect: 0 }
              : null,
          };
        }),

      answerQuiz: (questionId, answer) => {
        const { quizQuestions, activeSession } = get();
        if (!activeSession) return false;
        const q = quizQuestions.find((x) => x.id === questionId);
        if (!q) return false;
        const correct =
          answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        set({
          activeSession: {
            ...activeSession,
            quizProgress: activeSession.quizProgress + 1,
            quizCorrect: activeSession.quizCorrect + (correct ? 1 : 0),
          },
        });
        if (correct) {
          const word = get().vocabulary.find((w) => w.id === q.wordId);
          if (word) {
            set((s) => {
              const srs = { ...s.srs };
              const existing = srs[q.wordId] ?? createInitialSRS(q.wordId, word.term);
              srs[q.wordId] = advanceSRS(existing, true);
              return { srs };
            });
          }
        }
        return correct;
      },

      nextQuiz: () =>
        set((s) => {
          if (!s.activeSession) return s;
          const done = s.activeSession.quizProgress >= s.quizQuestions.length;
          if (!done) return s;
          return {
            activeSession: { ...s.activeSession, phase: "review" },
          };
        }),

      submitFinalReview: (answers) => {
        const s = get();
        if (!s.activeSession) return { score: 0, recommendations: [] };
        const words = s.getSessionWords();
        let correct = 0;
        const unknownTerms: string[] = [];
        const reviewAnswers: Record<string, boolean> = {};

        for (const word of words) {
          const given = answers[word.id]?.trim().toLowerCase() ?? "";
          const ok =
            given === word.translationRu.toLowerCase() ||
            given === word.term.toLowerCase();
          reviewAnswers[word.id] = ok;
          if (ok) correct += 1;
          else unknownTerms.push(word.term);
        }

        const score = sessionScore(correct, words.length);
        const recommendations = scoreRecommendations(score, unknownTerms);
        const dateKey = todayDateKey();
        const streakUpdate = updateStreak(
          s.stats.streak,
          s.stats.lastStudyDate,
          dateKey
        );

        const srs = { ...s.srs };
        for (const word of words) {
          const ok = reviewAnswers[word.id];
          const existing = srs[word.id] ?? createInitialSRS(word.id, word.term);
          srs[word.id] = advanceSRS(existing, ok);
        }

        const record: EnglishDayRecord = {
          id: uid("day"),
          dateKey,
          wordIds: words.map((w) => w.id),
          finalScore: score,
          completedAt: new Date().toISOString(),
        };

        const totalSessions = s.stats.totalSessionsCompleted + 1;
        const avg =
          s.stats.totalSessionsCompleted === 0
            ? score
            : Math.round(
                (s.stats.averageScore * s.stats.totalSessionsCompleted + score) /
                  totalSessions
              );

        set({
          srs,
          activeSession: {
            ...s.activeSession,
            phase: "complete",
            finalScore: score,
            recommendations,
            reviewAnswers,
            completedAt: new Date().toISOString(),
          },
          history: [record, ...s.history].slice(0, 120),
          stats: {
            streak: streakUpdate.streak,
            lastStudyDate: streakUpdate.lastStudyDate,
            totalWordsLearned: s.stats.totalWordsLearned + words.length,
            totalSessionsCompleted: totalSessions,
            averageScore: avg,
          },
        });

        return { score, recommendations };
      },

      getWord: (id) => get().vocabulary.find((w) => w.id === id),

      getSessionWords: () => {
        const { activeSession, vocabulary } = get();
        if (!activeSession) return [];
        return activeSession.selectedWordIds
          .map((id) => vocabulary.find((w) => w.id === id))
          .filter(Boolean) as EnglishVocabWord[];
      },

      getDueWords: () => {
        const { srs, vocabulary } = get();
        return Object.values(srs)
          .filter((r) => isDueForReview(r))
          .map((r) => vocabulary.find((w) => w.id === r.wordId))
          .filter(Boolean) as EnglishVocabWord[];
      },

      resetTodaySession: () =>
        set({ activeSession: null, quizQuestions: [], favoriteWordIds: [] }),
    }),
    {
      name: "mdp-english",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<EnglishState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...p.settings },
          stats: { ...DEFAULT_STATS, ...p.stats },
          vocabulary: p.vocabulary ?? current.vocabulary,
          favoriteWordIds: p.favoriteWordIds ?? [],
          srs: p.srs ?? {},
          history: p.history ?? [],
        };
      },
      partialize: (s) => ({
        settings: s.settings,
        vocabulary: s.vocabulary,
        favoriteWordIds: s.favoriteWordIds,
        activeSession: s.activeSession,
        srs: s.srs,
        history: s.history,
        stats: s.stats,
      }),
    }
  )
);
