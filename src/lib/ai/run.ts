import "server-only";
import { z } from "zod";
import {
  chatComplete,
  AIConfigError,
  AIRateLimitError,
  getProviderInfo,
} from "./provider";
import { extractJson, stripNulls } from "./schemas";

export interface StructuredResult<T> {
  data: T;
  provider: string;
  usedFallback: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a structured AI completion: system + user prompt in, validated JSON out.
 * Falls back locally when:
 * - no API key is configured
 * - provider rate-limits (429), after one short retry
 * so features keep working under quota pressure.
 */
export async function runStructured<T>(args: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  fallback: () => T;
  temperature?: number;
  maxTokens?: number;
}): Promise<StructuredResult<T>> {
  const call = async () => {
    const raw = await chatComplete(
      [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      {
        json: true,
        temperature: args.temperature ?? 0.7,
        maxTokens: args.maxTokens ?? 2500,
      }
    );
    return args.schema.parse(stripNulls(extractJson(raw)));
  };

  try {
    try {
      const data = await call();
      return {
        data,
        provider: getProviderInfo().provider,
        usedFallback: false,
      };
    } catch (err) {
      if (err instanceof AIRateLimitError) {
        await sleep(1200);
        const data = await call();
        return {
          data,
          provider: getProviderInfo().provider,
          usedFallback: false,
        };
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof AIConfigError || err instanceof AIRateLimitError) {
      return { data: args.fallback(), provider: "fallback", usedFallback: true };
    }
    throw err;
  }
}
