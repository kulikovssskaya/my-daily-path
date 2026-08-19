import { NextResponse } from "next/server";
import { readSyncState, writeSyncState, isSyncPersistenceAvailable } from "@/lib/sync/serverStore";
import { SYNC_STORAGE_KEYS, type SyncStorageKey } from "@/lib/sync/client";
import { SYNC_KEY_HEADER } from "@/lib/sync/syncAuth";
import {
  requiresSyncKey,
  verifySyncRequest,
} from "@/lib/sync/syncAuthServer";
import { isCloudSyncConfigured } from "@/lib/sync/redisEnv";
import { buildSyncSummary, emptySyncSummary } from "@/lib/sync/syncSummary";

export const runtime = "nodejs";

const MAX_BLOB_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

function emptyResponse(extra: Record<string, unknown> = {}) {
  return NextResponse.json({
    updatedAt: null,
    blobs: {},
    cloud: isCloudSyncConfigured(),
    optInRequired: requiresSyncKey(),
    ...emptySyncSummary(),
    ...extra,
  });
}

function unauthorized() {
  return NextResponse.json(
    { error: "Invalid sync code", needsKey: true, updatedAt: null, blobs: {} },
    { status: 401 }
  );
}

function etagFor(updatedAt: string) {
  return `"${updatedAt}"`;
}

function parseIfNoneMatch(header: string | null): string | null {
  if (!header) return null;
  const raw = header.trim();
  if (!raw || raw === "*") return null;
  // Take first tag; strip weak validator prefix and quotes.
  const first = raw.split(",")[0]?.trim() ?? "";
  return first.replace(/^W\//i, "").replaceAll('"', "") || null;
}

/** Cloud sync is opt-in: no header → empty (local-only). Wrong header → 401. */
export async function GET(req: Request) {
  const hasHeader = Boolean(req.headers.get(SYNC_KEY_HEADER)?.trim());
  const url = new URL(req.url);
  const metaOnly = url.searchParams.get("meta") === "1";

  if (requiresSyncKey()) {
    if (!hasHeader) return emptyResponse();
    if (!verifySyncRequest(req)) return unauthorized();
  }

  const state = await readSyncState();
  if (!state) {
    return emptyResponse();
  }

  const clientTag = parseIfNoneMatch(req.headers.get("if-none-match"));
  if (clientTag && clientTag === state.updatedAt) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etagFor(state.updatedAt),
        "Cache-Control": "private, no-cache",
      },
    });
  }

  const summary = buildSyncSummary(state.blobs);

  if (metaOnly) {
    return NextResponse.json(
      {
        updatedAt: state.updatedAt,
        blobs: {},
        cloud: isCloudSyncConfigured(),
        optInRequired: false,
        ...summary,
      },
      {
        headers: {
          ETag: etagFor(state.updatedAt),
          "Cache-Control": "private, no-cache",
        },
      }
    );
  }

  return NextResponse.json(
    {
      ...state,
      cloud: isCloudSyncConfigured(),
      optInRequired: false,
      ...summary,
    },
    {
      headers: {
        ETag: etagFor(state.updatedAt),
        "Cache-Control": "private, no-cache",
      },
    }
  );
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
  // Do not echo blob bodies — that doubles Fast Origin Transfer on every push.
  return NextResponse.json({
    updatedAt: saved.updatedAt,
    blobs: {},
    written: Object.keys(filtered),
    cloud: isCloudSyncConfigured(),
  });
}
