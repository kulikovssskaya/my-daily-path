import { applyEnglishHistoryBackfill } from "@/lib/englishHistoryBackfill";
import { computeStatsFromHistory } from "@/lib/englishStats";
import type {
  EnglishDailySession,
  EnglishDayRecord,
  EnglishSettings,
  EnglishStats,
  EnglishVocabWord,
  EnglishWordSRS,
} from "@/types";

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

const PHASE_RANK: Record<EnglishDailySession["phase"], number> = {
  drop: 0,
  select: 1,
  flashcards: 2,
  quiz: 3,
  review: 4,
  complete: 5,
};

export interface EnglishPersistState {
  settings: EnglishSettings;
  vocabulary: EnglishVocabWord[];
  favoriteWordIds: string[];
  activeSession: EnglishDailySession | null;
  srs: Record<string, EnglishWordSRS>;
  history: EnglishDayRecord[];
  stats: EnglishStats;
}

function normalizeEnglishState(raw: Partial<EnglishPersistState>): EnglishPersistState {
  const activeSession = raw.activeSession
    ? {
        ...raw.activeSession,
        matchingCorrect: raw.activeSession.matchingCorrect ?? 0,
        matchingDone: raw.activeSession.matchingDone ?? false,
      }
    : null;

  return {
    settings: { ...DEFAULT_SETTINGS, ...raw.settings },
    vocabulary: raw.vocabulary ?? [],
    favoriteWordIds: raw.favoriteWordIds ?? [],
    activeSession,
    srs: raw.srs ?? {},
    history: raw.history ?? [],
    stats: { ...DEFAULT_STATS, ...raw.stats },
  };
}

function parseEnglishPersistBlob(raw: string): {
  wrapper: Record<string, unknown>;
  state: EnglishPersistState;
} | null {
  try {
    const parsed = JSON.parse(raw) as {
      state?: Partial<EnglishPersistState>;
      version?: number;
    };
    const state = parsed.state ?? (parsed as Partial<EnglishPersistState>);
    if (!state || typeof state !== "object") return null;
    return {
      wrapper: parsed as Record<string, unknown>,
      state: normalizeEnglishState(state),
    };
  } catch {
    return null;
  }
}

function serializeEnglishPersistBlob(
  wrapper: Record<string, unknown>,
  state: EnglishPersistState
): string {
  const version = Math.max(Number(wrapper.version) || 0, 4);
  return JSON.stringify({ ...wrapper, state, version });
}

function pickBetterWord(a: EnglishVocabWord, b: EnglishVocabWord): EnglishVocabWord {
  const aScore =
    (a.userExample ? 2 : 0) + (a.definition?.length ?? 0) + (a.example?.length ?? 0);
  const bScore =
    (b.userExample ? 2 : 0) + (b.definition?.length ?? 0) + (b.example?.length ?? 0);
  if (aScore !== bScore) return aScore > bScore ? a : b;
  return a;
}

function mergeWord(a: EnglishVocabWord, b: EnglishVocabWord): EnglishVocabWord {
  return {
    ...a,
    ...b,
    userExample: a.userExample ?? b.userExample,
  };
}

function mergeVocabulary(
  a: EnglishVocabWord[],
  b: EnglishVocabWord[]
): EnglishVocabWord[] {
  const byId = new Map<string, EnglishVocabWord>();
  const byTerm = new Map<string, EnglishVocabWord>();

  for (const word of [...a, ...b]) {
    const existingById = byId.get(word.id);
    if (existingById) {
      const merged = mergeWord(existingById, word);
      byId.set(word.id, merged);
      byTerm.set(word.term.toLowerCase(), merged);
      continue;
    }

    const termKey = word.term.toLowerCase();
    const existingByTerm = byTerm.get(termKey);
    if (existingByTerm && existingByTerm.id !== word.id) {
      const kept = pickBetterWord(existingByTerm, word);
      byId.delete(existingByTerm.id);
      byId.set(kept.id, kept);
      byTerm.set(termKey, kept);
      continue;
    }

    byId.set(word.id, word);
    byTerm.set(termKey, word);
  }

  return [...byId.values()];
}

function isBetterHistoryRecord(
  candidate: EnglishDayRecord,
  existing: EnglishDayRecord
): boolean {
  const candidateTime = new Date(candidate.completedAt).getTime();
  const existingTime = new Date(existing.completedAt).getTime();
  if (candidateTime !== existingTime) return candidateTime > existingTime;
  return candidate.finalScore >= existing.finalScore;
}

function mergeHistory(
  a: EnglishDayRecord[],
  b: EnglishDayRecord[]
): EnglishDayRecord[] {
  const byDate = new Map<string, EnglishDayRecord>();
  for (const record of [...a, ...b]) {
    const existing = byDate.get(record.dateKey);
    if (!existing || isBetterHistoryRecord(record, existing)) {
      byDate.set(record.dateKey, record);
    }
  }
  return [...byDate.values()]
    .sort((x, y) => y.dateKey.localeCompare(x.dateKey))
    .slice(0, 120);
}

function isBetterSrs(candidate: EnglishWordSRS, existing: EnglishWordSRS): boolean {
  const candidateTime = candidate.lastReviewedAt
    ? new Date(candidate.lastReviewedAt).getTime()
    : 0;
  const existingTime = existing.lastReviewedAt
    ? new Date(existing.lastReviewedAt).getTime()
    : 0;
  if (candidateTime !== existingTime) return candidateTime > existingTime;
  if (candidate.intervalIndex !== existing.intervalIndex) {
    return candidate.intervalIndex > existing.intervalIndex;
  }
  return candidate.timesCorrect >= existing.timesCorrect;
}

function mergeSrs(
  a: Record<string, EnglishWordSRS>,
  b: Record<string, EnglishWordSRS>
): Record<string, EnglishWordSRS> {
  const merged = { ...a };
  for (const [wordId, srs] of Object.entries(b)) {
    const existing = merged[wordId];
    if (!existing || isBetterSrs(srs, existing)) merged[wordId] = srs;
  }
  return merged;
}

function sessionProgress(session: EnglishDailySession): number {
  const phaseScore = PHASE_RANK[session.phase] * 1000;
  const quizScore = (session.quizProgress ?? 0) * 10 + (session.quizCorrect ?? 0);
  const matchingScore = (session.matchingCorrect ?? 0) * 5;
  const selectedScore = session.selectedWordIds.length;
  return phaseScore + quizScore + matchingScore + selectedScore;
}

function mergeActiveSession(
  a: EnglishDailySession | null,
  b: EnglishDailySession | null
): EnglishDailySession | null {
  if (!a) return b;
  if (!b) return a;

  if (a.dateKey !== b.dateKey) {
    if (a.phase === "complete" && b.phase !== "complete") return a;
    if (b.phase === "complete" && a.phase !== "complete") return b;
    return a.dateKey > b.dateKey ? a : b;
  }

  return sessionProgress(a) >= sessionProgress(b) ? a : b;
}

/** Merge two English persist snapshots — union history by day, keep best SRS, recompute stats. */
export function mergeEnglishPersistStates(
  a: EnglishPersistState,
  b: EnglishPersistState
): EnglishPersistState {
  const vocabulary = mergeVocabulary(a.vocabulary, b.vocabulary);
  const history = mergeHistory(a.history, b.history);
  const favoriteWordIds = [...new Set([...a.favoriteWordIds, ...b.favoriteWordIds])];

  return finalizeEnglishState({
    settings: { ...DEFAULT_SETTINGS, ...a.settings, ...b.settings },
    vocabulary,
    favoriteWordIds,
    activeSession: mergeActiveSession(a.activeSession, b.activeSession),
    srs: mergeSrs(a.srs, b.srs),
    history,
    stats: DEFAULT_STATS,
  });
}

/** Apply backfill + recompute stats so history and average score always match. */
export function finalizeEnglishState(state: EnglishPersistState): EnglishPersistState {
  const withBackfill = applyEnglishHistoryBackfill(state);
  return {
    ...withBackfill,
    stats: computeStatsFromHistory(withBackfill.history),
  };
}

export function reconcileEnglishPersistBlob(raw: string): string {
  const parsed = parseEnglishPersistBlob(raw);
  if (!parsed) return raw;
  return serializeEnglishPersistBlob(
    parsed.wrapper,
    finalizeEnglishState(parsed.state)
  );
}

/** Merge two Zustand persist blobs for mdp-english. */
export function mergeEnglishPersistBlobs(a: string, b: string): string {
  const parsedA = parseEnglishPersistBlob(a);
  const parsedB = parseEnglishPersistBlob(b);
  if (!parsedA) return reconcileEnglishPersistBlob(b);
  if (!parsedB) return reconcileEnglishPersistBlob(a);

  const merged = mergeEnglishPersistStates(parsedA.state, parsedB.state);
  const wrapper = {
    ...parsedA.wrapper,
    ...parsedB.wrapper,
    version: Math.max(Number(parsedA.wrapper.version) || 0, Number(parsedB.wrapper.version) || 0, 4),
  };
  return serializeEnglishPersistBlob(wrapper, merged);
}
