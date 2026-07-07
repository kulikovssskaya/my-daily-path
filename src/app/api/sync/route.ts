import { NextResponse } from "next/server";
import { readSyncState, writeSyncState, isSyncPersistenceAvailable } from "@/lib/sync/serverStore";
import { SYNC_STORAGE_KEYS, type SyncStorageKey } from "@/lib/sync/client";
import { SYNC_KEY_HEADER } from "@/lib/sync/syncAuth";
import {
  requiresSyncKey,
  verifySyncRequest,
} from "@/lib/sync/syncAuthServer";
import { isCloudSyncConfigured } from "@/lib/sync/redisEnv";

export const runtime = "nodejs";

const MAX_BLOB_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

function emptyResponse(extra: Record<string, unknown> = {}) {
  return NextResponse.json({
    updatedAt: null,
    blobs: {},
    cloud: isCloudSyncConfigured(),
    optInRequired: requiresSyncKey(),
    ...extra,
  });
}

function unauthorized() {
  return NextResponse.json(
    { error: "Invalid sync code", needsKey: true, updatedAt: null, blobs: {} },
    { status: 401 }
  );
}

/** Cloud sync is opt-in: no header → empty (local-only). Wrong header → 401. */
export async function GET(req: Request) {
  const hasHeader = Boolean(req.headers.get(SYNC_KEY_HEADER)?.trim());

  if (requiresSyncKey()) {
    if (!hasHeader) return emptyResponse();
    if (!verifySyncRequest(req)) return unauthorized();
  }

  const state = await readSyncState();
  if (!state) {
    return emptyResponse();
  }
  return NextResponse.json({
    ...state,
    cloud: isCloudSyncConfigured(),
    optInRequired: false,
  });
}

export async function POST(req: Request) {
  if (requiresSyncKey() && !verifySyncRequest(req)) {
    return unauthorized();
  }

  if (process.env.VERCEL && !isSyncPersistenceAvailable()) {
    return NextResponse.json(
      { error: "Cloud storage is not configured on this server." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const blobs = (body as { blobs?: Record<string, string> })?.blobs ?? {};
  const filtered: Partial<Record<SyncStorageKey, string>> = {};
  let totalBytes = 0;

  for (const key of SYNC_STORAGE_KEYS) {
    const val = blobs[key];
    if (typeof val === "string" && val.length > 0) {
      const bytes = Buffer.byteLength(val, "utf8");
      if (bytes > MAX_BLOB_BYTES) {
        return NextResponse.json(
          { error: `Blob "${key}" exceeds ${MAX_BLOB_BYTES} bytes.` },
          { status: 413 }
        );
      }
      totalBytes += bytes;
      filtered[key] = val;
    }
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: `Total sync payload exceeds ${MAX_TOTAL_BYTES} bytes.` },
      { status: 413 }
    );
  }

  const saved = await writeSyncState(filtered);
  return NextResponse.json(saved);
}
