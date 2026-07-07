import type { EnglishVocabWord } from "@/types";
import { uid } from "@/lib/utils";

export type QuizQuestionType = "matching" | "multiple_choice" | "fill_blank";

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  wordId: string;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  hint?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wrongOptions(words: EnglishVocabWord[], correct: EnglishVocabWord, field: "translationRu" | "term"): string[] {
  return shuffle(
    words.filter((w) => w.id !== correct.id).map((w) => w[field])
  ).slice(0, 3);
}

export function buildQuizQuestions(words: EnglishVocabWord[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const list = shuffle(words);

  for (const word of list) {
    questions.push({
      id: uid("q"),
      type: "multiple_choice",
      wordId: word.id,
      prompt: `What is the best Russian translation of "${word.term}"?`,
      options: shuffle([word.translationRu, ...wrongOptions(words, word, "translationRu")]),
      correctAnswer: word.translationRu,
    });
  }

  for (const word of list.slice(0, Math.min(4, list.length))) {
    const escaped = word.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(escaped, "i").test(word.example)) continue;
    const blanked = word.example.replace(new RegExp(escaped, "i"), "___");
    questions.push({
      id: uid("q"),
      type: "fill_blank",
      wordId: word.id,
      prompt: blanked,
      options: shuffle([word.term, ...wrongOptions(words, word, "term")]),
      correctAnswer: word.term,
      hint: word.definition,
    });
  }

  return shuffle(questions);
}

export function buildFinalReviewQuestions(words: EnglishVocabWord[]): QuizQuestion[] {
  const mc = buildQuizQuestions(words).slice(0, words.length);
  return mc;
}

export function buildMatchingPairs(words: EnglishVocabWord[]): { id: string; term: string; translationRu: string }[] {
  return words.map((w) => ({ id: w.id, term: w.term, translationRu: w.translationRu }));
}

export function checkAnswer(q: QuizQuestion, answer: string): boolean {
  return answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
}

export function sessionScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
