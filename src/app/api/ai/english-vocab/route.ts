import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/ai/aiAuthServer";
import { runStructured } from "@/lib/ai/run";
import { ENGLISH_VOCAB_SYSTEM, buildEnglishVocabUserMessage } from "@/lib/ai/prompts";
import { englishVocabDropSchema, type EnglishVocabDrop } from "@/lib/ai/schemas";
import {
  fallbackVocabDrop,
  getFallbackEverydayPack,
  getFallbackTechPack,
} from "@/lib/englishConstants";
import { categoryMixTargets, finalizeVocabDrop } from "@/lib/englishVocabMix";

export const runtime = "nodejs";

function resolveEnglishVocabSystem(poolSize: number) {
  const { everydayTarget, techTarget } = categoryMixTargets(poolSize);
  return ENGLISH_VOCAB_SYSTEM.replaceAll("${poolSize}", String(poolSize))
    .replaceAll("${everydayTarget}", String(everydayTarget))
    .replaceAll("${techTarget}", String(techTarget));
}

function buildDrop(
  words: EnglishVocabDrop["words"],
  poolSize: number,
  knownTerms: string[],
  reasoning: string
): EnglishVocabDrop {
  const finalized = finalizeVocabDrop(
    words,
    poolSize,
    knownTerms,
    getFallbackEverydayPack(),
    getFallbackTechPack()
  );
  return {
    reasoning,
    words: finalized,
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const poolSize = Math.min(30, Math.max(20, Number(body?.poolSize) || 20));
  const level = typeof body?.level === "string" ? body.level : "B1-B2";
  const knownTerms: string[] = Array.isArray(body?.knownTerms)
    ? body.knownTerms.filter((t: unknown) => typeof t === "string")
    : [];
  const { everydayTarget, techTarget } = categoryMixTargets(poolSize);

  const fallback = (reasoning?: string): EnglishVocabDrop => {
    const words = fallbackVocabDrop(poolSize).map(
      ({ term, translationRu, definition, example, category, difficulty }) => ({
        term,
        translationRu,
        definition,
        example,
        category,
        difficulty,
      })
    );
    return buildDrop(
      words,
      poolSize,
      knownTerms,
      reasoning ??
        "Offline fallback vocabulary pack (50% everyday, 50% ML/IT)."
    );
  };

  // Missing sync code: still return a full local pack so study is not blocked.
  const denied = guardAiRequest(req);
  if (denied) {
    return NextResponse.json({
      data: fallback(
        "Local vocabulary pack — enable sync code in the sidebar for fresh AI words."
      ),
      provider: "fallback",
      usedFallback: true,
      needsKey: true,
    });
  }

  try {
    const result = await runStructured({
      system: resolveEnglishVocabSystem(poolSize),
      user: buildEnglishVocabUserMessage({
        poolSize,
        everydayTarget,
        techTarget,
        level,
        knownTerms,
      }),
      schema: englishVocabDropSchema,
      fallback: () => fallback(),
      temperature: 0.7,
      maxTokens: 4000,
    });

    const data = buildDrop(
      result.data.words,
      poolSize,
      knownTerms,
      result.data.reasoning ||
        `Generated ${poolSize} words: ${everydayTarget} everyday + ${techTarget} ML/IT.`
    );

    if (data.words.length < 10) {
      return NextResponse.json({ data: fallback() });
    }

    return NextResponse.json({ ...result, data });
  } catch {
    return NextResponse.json({
      data: fallback(),
      provider: "fallback",
      usedFallback: true,
    });
  }
}
