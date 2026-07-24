import "server-only";

// ============================================================
// Provider-agnostic AI layer.
// One interface over OpenAI, Anthropic (Claude) and Grok (xAI).
// Runs server-side only, so API keys never reach the browser.
// ============================================================

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ProviderId = "openai" | "anthropic" | "grok" | "gemini" | "groq";

interface ProviderConfig {
  id: ProviderId;
  model: string;
  apiKey: string | undefined;
}

function resolveProvider(): ProviderConfig {
  const id = (process.env.AI_PROVIDER || "openai").toLowerCase() as ProviderId;
  switch (id) {
    case "anthropic":
      return {
        id,
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        apiKey: process.env.ANTHROPIC_API_KEY,
      };
    case "grok":
      return {
        id,
        model: process.env.XAI_MODEL || "grok-2-latest",
        apiKey: process.env.XAI_API_KEY,
      };
    case "gemini":
      return {
        id,
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        apiKey: process.env.GEMINI_API_KEY,
      };
    case "groq":
      return {
        id,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        apiKey: process.env.GROQ_API_KEY,
      };
    case "openai":
    default:
      return {
        id: "openai",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
      };
  }
}

export function getProviderInfo() {
  const c = resolveProvider();
  return { provider: c.id, model: c.model, hasKey: Boolean(c.apiKey) };
}

export class AIConfigError extends Error {}

/** Provider returned HTTP 429 (or equivalent rate-limit body). */
export class AIRateLimitError extends Error {
  status = 429;
}

interface ChatOptions {
  temperature?: number;
  /** Ask the provider to return a strict JSON object when supported. */
  json?: boolean;
  maxTokens?: number;
}

/** OpenAI + Grok share the OpenAI Chat Completions API shape. */
async function openAICompatible(
  cfg: ProviderConfig,
  baseUrl: string,
  messages: ChatMessage[],
  opts: ChatOptions
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new AIRateLimitError(`${cfg.id} rate limit (429). Try again in a minute.`);
    }
    throw new Error(`${cfg.id} API error (${res.status})`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function anthropic(
  cfg: ProviderConfig,
  messages: ChatMessage[],
  opts: ChatOptions
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cfg.model,
      system,
      messages: rest,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new AIRateLimitError("anthropic rate limit (429). Try again in a minute.");
    }
    throw new Error(`anthropic API error (${res.status})`);
  }
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

/**
 * Send a chat request to the configured provider and return the raw text.
 * Throws AIConfigError when no API key is set (callers may use a fallback).
 */
export async function chatComplete(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<string> {
  const cfg = resolveProvider();
  if (!cfg.apiKey) {
    throw new AIConfigError(
      `No API key configured for provider "${cfg.id}". Set the key in .env.local.`
    );
  }

  switch (cfg.id) {
    case "anthropic":
      return anthropic(cfg, messages, opts);
    case "grok":
      return openAICompatible(cfg, "https://api.x.ai/v1", messages, opts);
    case "gemini":
      return openAICompatible(
        cfg,
        "https://generativelanguage.googleapis.com/v1beta/openai",
        messages,
        opts
      );
    case "groq":
      return openAICompatible(cfg, "https://api.groq.com/openai/v1", messages, opts);
    case "openai":
    default:
      return openAICompatible(cfg, "https://api.openai.com/v1", messages, opts);
  }
}
