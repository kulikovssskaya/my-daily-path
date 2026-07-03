import { NextResponse } from "next/server";
import { readSyncState, writeSyncState } from "@/lib/sync/serverFile";
import { SYNC_STORAGE_KEYS, type SyncStorageKey } from "@/lib/sync/client";

export const runtime = "nodejs";

export async function GET() {
  const state = await readSyncState();
  if (!state) {
    return NextResponse.json({ updatedAt: null, blobs: {} });
  }
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const blobs = (body as { blobs?: Record<string, string> })?.blobs ?? {};
  const filtered: Partial<Record<SyncStorageKey, string>> = {};

  for (const key of SYNC_STORAGE_KEYS) {
    const val = blobs[key];
    if (typeof val === "string" && val.length > 0) {
      filtered[key] = val;
    }
  }

  const existing = await readSyncState();
  const merged = { ...(existing?.blobs ?? {}), ...filtered };
  const saved = await writeSyncState(merged);
  return NextResponse.json(saved);
}
