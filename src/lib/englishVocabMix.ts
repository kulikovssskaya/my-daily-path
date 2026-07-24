import type { EnglishCategory, EnglishVocabWord } from "@/types";

export const EVERYDAY_CATEGORIES = ["everyday", "phrasal", "idiom"] as const;
export const TECH_CATEGORIES = ["it", "ml", "analytics"] as const;

export function normalizeEnglishTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function isEverydayCategory(category: EnglishCategory): boolean {
  return (EVERYDAY_CATEGORIES as readonly string[]).includes(category);
}

export function isTechCategory(category: EnglishCategory): boolean {
  return (TECH_CATEGORIES as readonly string[]).includes(category);
}

export function categoryMixTargets(poolSize: number): {
  everydayTarget: number;
  techTarget: number;
} {
  const everydayTarget = Math.floor(poolSize / 2);
  return { everydayTarget, techTarget: poolSize - everydayTarget };
}

type VocabItem = Pick<
  EnglishVocabWord,
  "term" | "translationRu" | "definition" | "example" | "category" | "difficulty"
>;

function dedupeItems(items: VocabItem[]): VocabItem[] {
  const seen = new Set<string>();
  const out: VocabItem[] = [];
  for (const item of items) {
    const key = normalizeEnglishTerm(item.term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Fill one sphere to exact target: unseen AI → unseen fallback → known (last resort). */
function fillSphere(
  target: number,
  sources: VocabItem[][],
  used: Set<string>,
  known: Set<string>
): VocabItem[] {
  const out: VocabItem[] = [];

  const tryAdd = (pool: VocabItem[], allowKnown: boolean) => {
    for (const item of pool) {
      if (out.length >= target) return;
      const key = normalizeEnglishTerm(item.term);
      if (!key || used.has(key)) continue;
      if (!allowKnown && known.has(key)) continue;
      out.push(item);
      used.add(key);
    }
  };

  for (const allowKnown of [false, true]) {
    for (const pool of sources) {
      tryAdd(pool, allowKnown);
      if (out.length >= target) return out;
    }
  }

  return out;
}

/** Enforce exact poolSize with 50/50 everyday vs ML/IT. */
export function finalizeVocabDrop(
  rawWords: VocabItem[],
  poolSize: number,
  knownTerms: string[],
  fallbackEveryday: VocabItem[],
  fallbackTech: VocabItem[]
): VocabItem[] {
  const known = new Set(knownTerms.map(normalizeEnglishTerm));
  const { everydayTarget, techTarget } = categoryMixTargets(poolSize);
  const used = new Set<string>();

  const fresh = dedupeItems(rawWords);
  const freshEveryday = fresh.filter((w) => isEverydayCategory(w.category));
  const freshTech = fresh.filter((w) => isTechCategory(w.category));
  const fbEveryday = dedupeItems(fallbackEveryday);
  const fbTech = dedupeItems(fallbackTech);

  const everyday = fillSphere(
    everydayTarget,
    [freshEveryday, fbEveryday],
    used,
    known
  );
  const tech = fillSphere(techTarget, [freshTech, fbTech], used, known);

  return [...everyday, ...tech].slice(0, poolSize);
}

export function collectKnownTerms(
  vocabulary: Pick<EnglishVocabWord, "id" | "term">[],
  history: { wordIds: string[] }[]
): string[] {
  const terms = new Set<string>();
  for (const word of vocabulary) {
    if (word.term.trim()) terms.add(word.term.trim());
  }
  for (const day of history) {
    for (const id of day.wordIds) {
      const word = vocabulary.find((w) => w.id === id);
      if (word?.term.trim()) terms.add(word.term.trim());
    }
  }
  return [...terms];
}
