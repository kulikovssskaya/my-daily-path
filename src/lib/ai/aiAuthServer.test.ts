import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { guardAiRequest, requiresAiAuth, verifyAiRequest } from "./aiAuthServer";

describe("aiAuthServer", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("allows requests when no secret configured", () => {
    delete process.env.SYNC_SECRET;
    delete process.env.AI_API_SECRET;
    expect(requiresAiAuth()).toBe(false);
    const req = new Request("http://localhost/api/ai/plan", { method: "POST" });
    expect(verifyAiRequest(req)).toBe(true);
    expect(guardAiRequest(req)).toBeNull();
  });

  it("requires matching sync header when secret set", () => {
    process.env.SYNC_SECRET = "my-secret-code";
    expect(requiresAiAuth()).toBe(true);
    const bad = new Request("http://localhost/api/ai/plan", { method: "POST" });
    expect(verifyAiRequest(bad)).toBe(false);
    expect(guardAiRequest(bad)?.status).toBe(401);

    const good = new Request("http://localhost/api/ai/plan", {
      method: "POST",
      headers: { "x-sync-key": "my-secret-code" },
    });
    expect(verifyAiRequest(good)).toBe(true);
    expect(guardAiRequest(good)).toBeNull();
  });

  it("prefers AI_API_SECRET over SYNC_SECRET", () => {
    process.env.SYNC_SECRET = "sync-only";
    process.env.AI_API_SECRET = "ai-only";
    const req = new Request("http://localhost/api/ai/plan", {
      method: "POST",
      headers: { "x-sync-key": "ai-only" },
    });
    expect(verifyAiRequest(req)).toBe(true);
  });
});
