function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[ё]/g, "е")
    .replace(/\s+/g, " ");
}

function translationVariants(translationRu: string): string[] {
  return translationRu
    .split(/[,;/|]|(?:\s+-\s+)|(?:\s+–\s+)/)
    .map(normalize)
    .filter(Boolean);
}

function significantWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 2);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}

/** Fuzzy match for Russian/English words (synonyms, typos, разложить ≈ разобрать). */
function similarWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return true;

  const minLen = Math.min(a.length, b.length);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen - minLen > 3) return false;

  let prefix = 0;
  while (prefix < minLen && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < minLen - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++;
  }
  // Shared Russian verb stem, e.g. разложить / разобрать
  if (prefix >= 3 && suffix >= 2) return true;

  if (maxLen >= 5) {
    const dist = levenshtein(a, b);
    const ratio = 1 - dist / maxLen;
    if (ratio >= 0.55) return true;
  }

  return false;
}

function wordOverlap(a: string, b: string): boolean {
  const aWords = significantWords(a);
  const bWords = significantWords(b);
  if (aWords.length === 0 || bWords.length === 0) return false;

  let hits = 0;
  const used = new Set<number>();
  for (const w of aWords) {
    for (let i = 0; i < bWords.length; i++) {
      if (used.has(i)) continue;
      if (similarWord(w, bWords[i])) {
        hits++;
        used.add(i);
        break;
      }
    }
  }

  const minLen = Math.min(aWords.length, bWords.length);
  const total = Math.max(aWords.length, bWords.length);
  return (
    hits >= Math.max(1, Math.ceil(minLen * 0.5)) ||
    hits / total >= 0.6
  );
}

/** All key words from the expected variant appear in the user's answer. */
function coversVariant(given: string, variant: string): boolean {
  const givenWords = significantWords(given);
  const variantWords = significantWords(variant);
  if (variantWords.length === 0) return false;
  return variantWords.every((vw) => givenWords.some((gw) => similarWord(gw, vw)));
}

export function matchesEnglishTerm(given: string, term: string): boolean {
  const g = normalize(given);
  const t = normalize(term);
  if (!g || !t) return false;
  if (g === t) return true;
  return g.replace(/[^a-z0-9\s-]/gi, "") === t.replace(/[^a-z0-9\s-]/gi, "");
}

export function matchesTranslation(given: string, translationRu: string): boolean {
  const g = normalize(given);
  if (!g) return false;

  const variants = translationVariants(translationRu);
  if (variants.length === 0) variants.push(normalize(translationRu));

  for (const v of variants) {
    if (g === v) return true;
    if (g.length >= 3 && v.length >= 3 && (v.includes(g) || g.includes(v))) return true;
    if (wordOverlap(g, v)) return true;
    if (coversVariant(g, v)) return true;
  }
  return false;
}

export function matchesFinalReviewAnswer(
  given: string,
  term: string,
  translationRu: string
): boolean {
  if (!given.trim()) return false;
  return matchesEnglishTerm(given, term) || matchesTranslation(given, translationRu);
}
