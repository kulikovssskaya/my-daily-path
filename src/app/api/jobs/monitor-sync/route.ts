import { NextResponse } from "next/server";
import {
  monitorVacancyToApplication,
  type MonitorVacancyPayload,
} from "@/lib/monitor/mapVacancy";
import {
  getMonitorApplications,
  replaceMonitorApplications,
  upsertMonitorApplications,
  MONITOR_SYNC_SINCE,
} from "@/lib/monitor/store";

export const runtime = "nodejs";

function checkSecret(req: Request): boolean {
  const secret = process.env.MONITOR_SYNC_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/** Pull applications synced from SearchJob monitor (since MONITOR_SYNC_SINCE). */
export async function GET(req: Request) {
  const chatId = new URL(req.url).searchParams.get("chatId")?.trim();
  if (!chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }

  try {
    const applications = await getMonitorApplications(chatId);
    return NextResponse.json({
      applications,
      since: MONITOR_SYNC_SINCE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync read failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

/**
 * Push vacancy decisions from SearchJob.
 * Body: { chatId, vacancies, replace?: boolean }
 * replace=true overwrites Redis (used to reset history).
 */
export async function POST(req: Request) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const chatId = typeof body?.chatId === "string" ? body.chatId.trim() : "";
  const vacancies = Array.isArray(body?.vacancies) ? body.vacancies : [];
  const replace = body?.replace === true;

  if (!chatId) {
    return NextResponse.json({ error: "chatId required" }, { status: 400 });
  }
  if (!replace && vacancies.length === 0) {
    return NextResponse.json({ error: "vacancies array required" }, { status: 400 });
  }

  try {
    const applications = vacancies.map((v: MonitorVacancyPayload) =>
      monitorVacancyToApplication(v)
    );
    const saved = replace
      ? await replaceMonitorApplications(chatId, applications)
      : await upsertMonitorApplications(chatId, applications);
    return NextResponse.json({
      ok: true,
      count: applications.length,
      total: saved.length,
      since: MONITOR_SYNC_SINCE,
      replaced: replace,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync write failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
