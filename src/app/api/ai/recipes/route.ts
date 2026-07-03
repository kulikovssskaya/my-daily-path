import { NextResponse } from "next/server";
import { runStructured } from "@/lib/ai/run";
import { RECIPES_SYSTEM, buildRecipesUserMessage } from "@/lib/ai/prompts";
import { recipesResponseSchema } from "@/lib/ai/schemas";
import { normalizeMemory } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fridge: string[] = Array.isArray(body?.fridge) ? body.fridge : [];
  const request: string = typeof body?.request === "string" ? body.request : "";
  const memory = normalizeMemory(body?.memory);

  const fallback = () => {
    const base = fridge.slice(0, 5);
    const recipes = [
      {
        title: base.length ? `Quick dish with: ${base.slice(0, 3).join(", ")}` : "Veggie omelette",
        ingredients: base.length ? base : ["eggs", "vegetables", "salt"],
        steps: [
          "Prep the ingredients.",
          "Sauté / combine the main items.",
          "Cook through and serve.",
        ],
        timeMinutes: 20,
        calories: 400,
        usesItems: base,
      },
      {
        title: "Salad from what you have",
        ingredients: base.length ? base : ["vegetables", "oil", "greens"],
        steps: ["Chop the ingredients.", "Dress with oil.", "Toss and serve."],
        timeMinutes: 10,
        calories: 250,
        usesItems: base,
      },
    ];
    return { recipes };
  };

  try {
    const result = await runStructured({
      system: RECIPES_SYSTEM,
      user: buildRecipesUserMessage({ fridge, memory, request }),
      schema: recipesResponseSchema,
      fallback,
      temperature: 0.8,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
