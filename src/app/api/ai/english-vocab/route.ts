import { NextResponse } from "next/server";
import { runStructured } from "@/lib/ai/run";
import { ENGLISH_VOCAB_SYSTEM, buildEnglishVocabUserMessage } from "@/lib/ai/prompts";
import { englishVocabDropSchema, type EnglishVocabDrop } from "@/lib/ai/schemas";
import { fallbackVocabDrop } from "@/lib/englishConstants";
import type { EnglishCategory } from "@/types";

export const runtime = "nodejs";

const ENGLISH_VOCAB_SYSTEM_RESOLVED = ENGLISH_VOCAB_SYSTEM.replace(
  "${poolSize}",
  "20-25"
);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const poolSize = Math.min(30, Math.max(15, Number(body?.poolSize) || 22));
  const level = typeof body?.level === "string" ? body.level : "B1-B2";
  const focusCategories: EnglishCategory[] = Array.isArray(body?.focusCategories)
    ? body.focusCategories
    : ["everyday", "it", "ml", "analytics", "phrasal", "idiom"];
  const knownTerms: string[] = Array.isArray(body?.knownTerms)
    ? body.knownTerms.filter((t: unknown) => typeof t === "string")
    : [];

  const fallback = (): EnglishVocabDrop => ({
    reasoning: "Offline fallback vocabulary pack.",
    words: fallbackVocabDrop(poolSize).map(({ term, translationRu, definition, example, category, difficulty }) => ({
      term,
      translationRu,
      definition,
      example,
      category,
      difficulty,
    })),
  });

  try {
    const result = await runStructured({
      system: ENGLISH_VOCAB_SYSTEM_RESOLVED,
      user: buildEnglishVocabUserMessage({
        poolSize,
        focusCategories,
        level,
        knownTerms,
      }),
      schema: englishVocabDropSchema,
      fallback,
      temperature: 0.75,
      maxTokens: 4000,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
