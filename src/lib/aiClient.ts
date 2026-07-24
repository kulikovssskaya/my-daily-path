"use client";

import { SYNC_KEY_HEADER } from "@/lib/sync/syncAuth";
import { getStoredSyncKey } from "@/lib/sync/syncAuthClient";

function aiHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = getStoredSyncKey();
  if (key) headers[SYNC_KEY_HEADER] = key;
  return headers;
}

/** Small client helper to call our AI routes with JSON and typed results. */
export async function postAI<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: aiHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new Error(
      (data as { error?: string })?.error ||
        "Enter your sync code in the sidebar to use AI features."
    );
  }
  if (!res.ok || (data as { error?: string })?.error) {
    throw new Error((data as { error?: string })?.error || `Error ${res.status}`);
  }
  return data as T;
}

/** Same headers as postAI — for routes that use raw fetch. */
export { aiHeaders };
