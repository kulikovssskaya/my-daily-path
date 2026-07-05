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

function wordOverlap(a: string, b: string): boolean {
  const aWords = a.split(/\s+/).filter((w) => w.length > 2);
  const bWords = b.split(/\s+/).filter((w) => w.length > 2);
  if (aWords.length === 0 || bWords.length === 0) return false;
  const hits = aWords.filter((w) =>
    bWords.some((bw) => bw.includes(w) || w.includes(bw))
  ).length;
  const minLen = Math.min(aWords.length, bWords.length);
  return hits >= Math.max(1, Math.ceil(minLen * 0.5));
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
