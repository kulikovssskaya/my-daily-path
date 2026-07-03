import { NextResponse } from "next/server";
import { runStructured } from "@/lib/ai/run";
import {
  FRIDGE_COMMAND_SYSTEM,
  buildFridgeCommandUserMessage,
} from "@/lib/ai/prompts";
import { fridgeCommandSchema, type FridgeCommand } from "@/lib/ai/schemas";
import { expandRemoveTerms } from "@/lib/fridgeMatch";

export const runtime = "nodejs";

const REMOVE_RE =
  /\b(remove|delete|drop|eat|ate|used|use|finish|finished|throw|out of|убери|удали|удалить|выкини|выкинь|съел|съела|доел|закончил|закончилось|кончил|выброс)\b/i;
const HEADER_RE =
  /^(grains?|carbs?|proteins?|vegetables?|veggies|fruits?|nuts?|sauces?|spices?|dairy|sweets?|other|крупы|углеводы|белки|овощи|фрукты|орехи|соусы|специи|молочн|сладости|другое|прочее)\b/i;

function splitTokens(text: string): string[] {
  return text
    .replace(/[*•▪·]/g, "\n")
    .split(/[\n,;/]|\band\b|\bи\b/gi)
    .map((t) => t.replace(/^[\s:–—\-]+|[\s:]+$/g, "").trim())
    .filter((t) => t.length > 1 && !HEADER_RE.test(t));
}

function parseQty(raw: string): { name: string; qty?: string } {
  let name = raw.replace(/^\s*(add|buy|put|need|remove|delete|убери|удали|добавь|купи|положи)\s+/i, "");
  let qty: string | undefined;
  const paren = name.match(/\(([^)]+)\)/);
  if (paren) {
    name = name.replace(/\(([^)]+)\)/, "").trim();
    if (/\d/.test(paren[1])) qty = paren[1].trim();
  }
  name = name.replace(/[*•·]+/g, "").replace(/\s+/g, " ").trim();
  return { name, qty };
}

function fallback(instruction: string, fridge: string[]): FridgeCommand {
  const lines = instruction.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const add: { name: string; qty?: string }[] = [];
  const remove: string[] = [];
  for (const line of lines) {
    const isRemove = REMOVE_RE.test(line);
    for (const tok of splitTokens(line)) {
      const { name, qty } = parseQty(tok);
      if (!name) continue;
      if (isRemove) remove.push(name);
      else add.push({ name, qty });
    }
  }
  // Whole-line remove with no split tokens, e.g. "удали крупы"
  if (remove.length === 0 && REMOVE_RE.test(instruction)) {
    const cleaned = instruction.replace(REMOVE_RE, "").trim();
    if (cleaned) remove.push(cleaned);
  }
  return {
    reasoning: "Parsed offline. Category words like «крупы» match rice, pasta, oats, etc.",
    add,
    remove: expandRemoveTerms(remove, fridge),
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const instruction: string = typeof body?.instruction === "string" ? body.instruction : "";
  const fridge: string[] = Array.isArray(body?.fridge) ? body.fridge : [];
  if (!instruction.trim()) {
    return NextResponse.json({ error: "Empty instruction." }, { status: 400 });
  }

  try {
    const result = await runStructured({
      system: FRIDGE_COMMAND_SYSTEM,
      user: buildFridgeCommandUserMessage({ fridge, instruction }),
      schema: fridgeCommandSchema,
      fallback: () => fallback(instruction, fridge),
      temperature: 0.2,
      maxTokens: 1500,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
