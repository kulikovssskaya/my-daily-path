import { timingSafeEqual } from "crypto";
import { SYNC_KEY_HEADER } from "@/lib/sync/syncAuth";
import { isCloudSyncConfigured } from "@/lib/sync/redisEnv";

export function requiresSyncKey(): boolean {
  return isCloudSyncConfigured();
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifySyncRequest(req: Request): boolean {
  if (!isCloudSyncConfigured()) return true;
  const secret = process.env.SYNC_SECRET?.trim();
  if (!secret) return false;
  const provided = req.headers.get(SYNC_KEY_HEADER)?.trim();
  if (!provided) return false;
  return safeEqual(provided, secret);
}
