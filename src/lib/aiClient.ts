"use client";

/** Small client helper to call our AI routes with JSON and typed results. */
export async function postAI<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data as { error?: string })?.error) {
    throw new Error((data as { error?: string })?.error || `Error ${res.status}`);
  }
  return data as T;
}
