import { NextResponse } from "next/server";
import { isCloudSyncConfigured } from "@/lib/sync/redisEnv";
import { requiresSyncKey } from "@/lib/sync/syncAuthServer";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    cloud: isCloudSyncConfigured(),
    authRequired: requiresSyncKey(),
  });
}
