import "server-only";
import { z } from "zod";
import { chatComplete, AIConfigError, getProviderInfo } from "./provider";
import { extractJson, stripNulls } from "./schemas";

export interface StructuredResult<T> {
  data: T;
  provider: string;
  usedFallback: boolean;
}

/**
 * Run a structured AI completion: system + user prompt in, validated JSON out.
 * When no API key is configured, falls back to a locally-computed result so
 * every feature keeps working before a provider is set up.
 */
export async function runStructured<T>(args: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  fallback: () => T;
  temperature?: number;
  maxTokens?: number;
}): Promise<StructuredResult<T>> {
  try {
    const raw = await chatComplete(
      [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      { json: true, temperature: args.temperature ?? 0.7, maxTokens: args.maxTokens ?? 2500 }
    );
    const data = args.schema.parse(stripNulls(extractJson(raw)));
    return { data, provider: getProviderInfo().provider, usedFallback: false };
  } catch (err) {
    if (err instanceof AIConfigError) {
      return { data: args.fallback(), provider: "fallback", usedFallback: true };
    }
    throw err;
  }
}
