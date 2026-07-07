import { describe, expect, it } from "vitest";
import {
  requiresSyncKey,
  verifySyncRequest,
} from "@/lib/sync/syncAuthServer";
import { isCloudSyncConfigured } from "@/lib/sync/redisEnv";
import { SYNC_KEY_HEADER } from "@/lib/sync/syncAuth";

describe("sync auth", () => {
  it("allows open access when cloud sync is not configured", () => {
    const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isCloudSyncConfigured()).toBe(false);
    expect(
      verifySyncRequest(new Request("http://localhost/api/sync"))
    ).toBe(true);
    process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
  });

  it("requires matching sync key when cloud is configured", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.SYNC_SECRET = "my-secret-code";

    expect(requiresSyncKey()).toBe(true);
    expect(
      verifySyncRequest(new Request("http://localhost/api/sync"))
    ).toBe(false);

    const authed = new Request("http://localhost/api/sync", {
      headers: { [SYNC_KEY_HEADER]: "my-secret-code" },
    });
    expect(verifySyncRequest(authed)).toBe(true);

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.SYNC_SECRET;
  });

  it("denies access when cloud is configured but SYNC_SECRET is missing", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    delete process.env.SYNC_SECRET;

    expect(requiresSyncKey()).toBe(true);
    expect(
      verifySyncRequest(new Request("http://localhost/api/sync", {
        headers: { [SYNC_KEY_HEADER]: "any-key" },
      }))
    ).toBe(false);

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
});
