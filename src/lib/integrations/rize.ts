import type { EventCategory } from "@/types";

export const RIZE_GRAPHQL_URL =
  process.env.RIZE_GRAPHQL_URL ?? "https://api.rize.io/api/v1/graphql";

export const MIN_RIZE_ENTRY_MS = 60_000;

export type RizeEntryKind = "time" | "project" | "task" | "session" | "summary";

export interface RizeTimeEntry {
  id: string;
  description: string | null;
  duration: number | null;
  startTime: string;
  endTime: string;
  source: string | null;
  projectName: string | null;
  clientName: string | null;
  /** Rize AI summary shown in the app (e.g. "Researched and Configured Cursor AI Agents"). */
  entryTitle?: string | null;
  /** Window titles with share % — stored in notes, not the calendar title. */
  titleBreakdown?: RizeTitleShare[];
  kind: RizeEntryKind;
  status?: string | null;
}

export interface RizeTitleShare {
  label: string;
  percent: number;
}

export const MIN_TITLE_SHARE_PERCENT = 5;
/** Rize Titles tab rarely shows app noise under ~2 min (e.g. background Telegram). */
export const MIN_TELEGRAM_TITLE_SEC = 120;

export interface RizeCalendarEvent {
  rizeEntryId: string;
  title: string;
  category: EventCategory;
  start: string;
  end: string;
  track?: string;
  notes?: string;
}

export interface RizeSyncWindow {
  start: Date;
  end: Date;
}

export interface RizeFetchStats {
  timeEntries: number;
  projectEntries: number;
  taskEntries: number;
  sessions: number;
  appsTracked: number;
  summaries: number;
  appBlocks: number;
  categoryBlocks: number;
  topAppMinutes?: number;
  totalRaw: number;
  inWindow: number;
  mapped: number;
  tooShort: number;
  sources: string[];
  probeErrors: string[];
  userEmail?: string;
  generated?: boolean;
  generateError?: string;
}

type GraphqlResult<T> = { data: T | null; errors: string[] };

const QUERIES = {
  timeEntriesConnection: `
    query TimeEntriesConn($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!, $first: Int) {
      timeEntries(startTime: $startTime, endTime: $endTime, first: $first) {
        edges {
          node {
            id
            title
            description
            startTime
            endTime
            status
            duration
            client { name }
            project { name }
            task { name }
          }
        }
      }
    }
  `,
  timeEntriesConnectionStatuses: `
    query TimeEntriesConn($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!, $statuses: [String!], $first: Int) {
      timeEntries(startTime: $startTime, endTime: $endTime, statuses: $statuses, first: $first) {
        edges {
          node {
            id
            title
            description
            startTime
            endTime
            status
            duration
            client { name }
            project { name }
            task { name }
          }
        }
      }
    }
  `,
  projectTimeEntriesRich: `
    query ProjectTimeEntries($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      projectTimeEntries(startTime: $startTime, endTime: $endTime) {
        id
        description
        startTime
        endTime
        status
        duration
        project { name client { name } }
      }
    }
  `,
  projectTimeEntriesPlain: `
    query ProjectTimeEntries($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      projectTimeEntries(startTime: $startTime, endTime: $endTime) {
        id
        description
        startTime
        endTime
        status
        duration
      }
    }
  `,
  taskTimeEntriesRich: `
    query TaskTimeEntries($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      taskTimeEntries(startTime: $startTime, endTime: $endTime) {
        id
        description
        startTime
        endTime
        status
        duration
        task { name project { name client { name } } }
      }
    }
  `,
  taskTimeEntriesPlain: `
    query TaskTimeEntries($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      taskTimeEntries(startTime: $startTime, endTime: $endTime) {
        id
        description
        startTime
        endTime
        status
        duration
      }
    }
  `,
  sessionsRich: `
    query Sessions($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      sessions(startTime: $startTime, endTime: $endTime) {
        id
        startTime
        endTime
        sessionType
        createdAt
        updatedAt
      }
    }
  `,
  sessionsPlain: `
    query Sessions($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      sessions(startTime: $startTime, endTime: $endTime) {
        id
        startTime
        endTime
        sessionType
      }
    }
  `,
  appsAndWebsites: `
    query Apps($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      appsAndWebsites(startTime: $startTime, endTime: $endTime) {
        id
        appName
        title
        url
        source
        timeSpent
        timeCategory { name key }
      }
    }
  `,
  appsAndWebsitesPlain: `
    query Apps($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      appsAndWebsites(startTime: $startTime, endTime: $endTime) {
        id
        appName
        timeSpent
      }
    }
  `,
  trackingEventsConnection: `
    query TrackingEvents($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!, $first: Int) {
      events(startTime: $startTime, endTime: $endTime, first: $first) {
        edges {
          node {
            title
            appName
            url
            startTime
            endTime
          }
        }
      }
    }
  `,
  categories: `
    query Categories($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      categories(startTime: $startTime, endTime: $endTime) {
        timeSpent
        category { key name focus work idle }
      }
    }
  `,
  summaryTotal: `
    query SummaryTotal($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      summary(startTime: $startTime, endTime: $endTime) {
        totalTime
        focusTime
        meetingTime
        breakTime
      }
    }
  `,
  currentUser: `
    query CurrentUser {
      currentUser { email name timezone }
    }
  `,
  summaries: `
    query Summaries($startDate: ISO8601Date!, $endDate: ISO8601Date!, $bucketSize: String!) {
      summaries(startDate: $startDate, endDate: $endDate, bucketSize: $bucketSize) {
        startTime
        endTime
        trackedTime
        focusTime
        meetingTime
        breakTime
      }
    }
  `,
};

const GENERATE_MUTATIONS = [
  `
    mutation Generate($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      generateTimeEntries(input: { args: { startTime: $startTime, endTime: $endTime } }) {
        timeEntries { id }
        errors { message }
      }
    }
  `,
  `
    mutation Generate($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      generateTimeEntries(input: { startTime: $startTime, endTime: $endTime }) {
        timeEntries { id }
        errors { message }
      }
    }
  `,
  `
    mutation Generate($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      generateTimeEntries(startTime: $startTime, endTime: $endTime) {
        id
      }
    }
  `,
];

const SUMMARY_BUCKET_SIZES = ["hour", "HalfHour", "15min", "day"];
const GENERATE_POLL_MS = [3000, 5000, 8000, 12000];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toDateOnly(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toRizeIso(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function rizeGraphql<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GraphqlResult<T>> {
  try {
    const res = await fetch(RIZE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    if (!res.ok) {
      return { data: null, errors: [`HTTP ${res.status}`] };
    }

    const body = (await res.json()) as {
      data?: T;
      errors?: { message: string }[];
    };

    const errors = body.errors?.map((e) => e.message) ?? [];
    return { data: body.data ?? null, errors };
  } catch (err) {
    return { data: null, errors: [err instanceof Error ? err.message : "Network error"] };
  }
}

function isRejectedStatus(status: unknown): boolean {
  return typeof status === "string" && /reject|discard|failed/i.test(status);
}

function pickName(obj: Record<string, unknown> | null | undefined): string | null {
  if (!obj || typeof obj.name !== "string") return null;
  return obj.name;
}

/** Rize AI often puts a long narrative in `title` — not the project tag shown in UI. */
export function isRizeAiNarrative(text: string): boolean {
  const t = text.trim();
  if (t.length >= 72) return true;
  return /^(conducted|dedicated|spent|worked|focused|reviewed|completed|engaged|utilized|performed|continued|researched|studied|implemented|explored|configured|developed|managed)\b/i.test(
    t
  );
}

/** Short label for Rize window titles — merges "Telegram (122757)" → "Telegram". */
export function simplifyRizeTitleLabel(raw: string): string {
  let t = raw.trim();
  if (!t) return t;
  t = t.replace(/\s*\(\d+\)\s*$/g, "");
  t = t.replace(/\s*[—–-]\s*\(\d+\)\s*$/g, "");
  t = t.replace(/\s*[—–-]\s*$/g, "");
  return t.trim() || raw.trim();
}

function rawDurationSec(
  raw: Record<string, unknown>,
  startTime: string,
  endTime: string
): number {
  const duration =
    typeof raw.duration === "number"
      ? raw.duration
      : typeof raw.duration === "string"
        ? Number.parseFloat(raw.duration)
        : 0;
  if (Number.isFinite(duration) && duration > 0) {
    return normalizeRizeSeconds(duration, [duration]);
  }
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.max(0, Math.round((end - start) / 1000));
}

export function parseTitleBreakdownFromRaw(
  raw: Record<string, unknown>,
  entryDurationSec?: number
): RizeTitleShare[] {
  const titles = raw.titles ?? raw.topTitles ?? raw.windowTitles;
  if (!Array.isArray(titles) || titles.length === 0) return [];

  const timeValues = titles.map((item) => {
    if (typeof item === "string") return 0;
    const row = item as Record<string, unknown>;
    return numField(row, "timeSpent") || numField(row, "duration") || numField(row, "time");
  });

  const resolveTimeSec = (raw: number): number => {
    if (raw <= 0) return 0;
    const sumRaw = timeValues.reduce((a, b) => a + (b > 0 ? b : 0), 0);
    if (entryDurationSec && entryDurationSec > 0 && sumRaw > 0) {
      const errAsSec = Math.abs(sumRaw - entryDurationSec);
      const errAsMin = Math.abs(sumRaw * 60 - entryDurationSec);
      if (errAsMin <= errAsSec) return raw * 60;
      return raw;
    }
    return normalizeRizeSeconds(raw, timeValues);
  };

  const parsed = titles
    .map((item, i) => {
      if (typeof item === "string") {
        return { label: item.trim(), timeSec: 0, percentDirect: 0 };
      }
      const row = item as Record<string, unknown>;
      const label =
        typeof row.title === "string"
          ? row.title.trim()
          : typeof row.name === "string"
            ? row.name.trim()
            : "";
      const timeRaw = timeValues[i] ?? 0;
      const percentDirect = numField(row, "percentage") || numField(row, "percent");
      return {
        label,
        timeSec: resolveTimeSec(timeRaw),
        percentDirect,
      };
    })
    .filter((x) => x.label.length > 0);

  const totalFromTitles = parsed.reduce((sum, p) => sum + p.timeSec, 0);
  // Rize percentages are relative to tracked title time, not wall-clock block length.
  const totalSec = totalFromTitles > 0 ? totalFromTitles : entryDurationSec ?? 0;
  if (totalSec <= 0 && parsed.every((p) => p.percentDirect <= 0)) return [];

  const grouped = new Map<string, { timeSec: number; percentSum: number }>();
  for (const p of parsed) {
    const key = simplifyRizeTitleLabel(p.label);
    const bucket = grouped.get(key) ?? { timeSec: 0, percentSum: 0 };
    bucket.timeSec += p.timeSec;
    if (p.percentDirect > 0) bucket.percentSum += p.percentDirect;
    grouped.set(key, bucket);
  }

  const shares: RizeTitleShare[] = [];
  for (const [label, bucket] of grouped) {
    const percent =
      bucket.percentSum > 0
        ? bucket.percentSum
        : totalSec > 0
          ? (bucket.timeSec / totalSec) * 100
          : 0;
    if (shouldShowTitleShare(label, bucket.timeSec, percent)) {
      shares.push({ label, percent });
    }
  }

  shares.sort((a, b) => b.percent - a.percent);
  return shares;
}

export function formatTitleBreakdown(shares: RizeTitleShare[]): string {
  return shares
    .map((s) => `${s.label.toLowerCase()} ${Math.round(s.percent)}%`)
    .join(" + ");
}

/** Build Titles-tab-style shares from appsAndWebsites for one entry window. */
export function buildTitleBreakdownFromApps(
  apps: Record<string, unknown>[],
  durationSec: number
): RizeTitleShare[] {
  if (apps.length === 0 || durationSec <= 0) return [];

  const timeValues = apps.map((a) => readTimeSpent(a));
  const sumRaw = timeValues.reduce((a, b) => a + (b > 0 ? b : 0), 0);
  const resolveTimeSec = (raw: number): number => {
    if (raw <= 0) return 0;
    if (sumRaw > 0) {
      const errAsSec = Math.abs(sumRaw - durationSec);
      const errAsMin = Math.abs(sumRaw * 60 - durationSec);
      if (errAsMin <= errAsSec) return raw * 60;
      return raw;
    }
    return normalizeRizeSeconds(raw, timeValues);
  };

  const grouped = new Map<string, number>();

  for (let i = 0; i < apps.length; i++) {
    const label = labelFromAppRow(apps[i]);
    const timeSec = resolveTimeSec(timeValues[i] ?? 0);
    if (timeSec <= 0) continue;
    grouped.set(label, (grouped.get(label) ?? 0) + timeSec);
  }

  return sharesFromGroupedSeconds(grouped, durationSec);
}

function eventDurationSec(ev: Record<string, unknown>): number {
  const start = typeof ev.startTime === "string" ? new Date(ev.startTime).getTime() : 0;
  const end = typeof ev.endTime === "string" ? new Date(ev.endTime).getTime() : 0;
  return Math.max(0, Math.round((end - start) / 1000));
}

/** Person/chat windows on Telegram — counted in timeline but not in Rize Titles pool. */
function isPersonalChatEvent(appName: string, winTitle: string): boolean {
  if (!/telegram/i.test(appName)) return false;
  const title = winTitle.trim();
  if (!title) return false;
  if (/^study$/i.test(title)) return false;
  if (/^telegram(\s|\(|desktop|$)/i.test(title)) return false;
  return true;
}

function isTelegramBrandedTitle(winTitle: string): boolean {
  const title = winTitle.trim();
  return /^telegram(\s|\(|desktop|$)/i.test(title);
}

function readAppsTotalSec(apps: Record<string, unknown>[]): number {
  const allTimeValues = apps.map((a) => readTimeSpent(a));
  let total = 0;
  for (const spent of allTimeValues) {
    if (spent <= 0) continue;
    total += normalizeRizeSeconds(spent, allTimeValues);
  }
  return total;
}

function readAppSeconds(apps: Record<string, unknown>[], appPattern: RegExp): number {
  const allTimeValues = apps.map((a) => readTimeSpent(a));
  let total = 0;
  for (const raw of apps) {
    const appName = typeof raw.appName === "string" ? raw.appName : "";
    if (!appPattern.test(appName)) continue;
    const spent = readTimeSpent(raw);
    if (spent <= 0) continue;
    total += normalizeRizeSeconds(spent, allTimeValues);
  }
  return total;
}

function normalizeEventLabel(label: string, appName: string): string {
  if (/telegram/i.test(appName) && !/^study$/i.test(label)) return "Telegram";
  return label;
}

/**
 * Rize Titles tab uses window titles from `events` (Study) with a title pool that
 * excludes personal Telegram chats and adjusts for app-level overlap.
 */
export function buildTitleBreakdownFromEventsAndApps(
  events: Record<string, unknown>[],
  apps: Record<string, unknown>[],
  entryDurationSec: number
): RizeTitleShare[] {
  if (events.length === 0 || entryDurationSec <= 0) return [];

  let studyTitleSec = 0;
  let telegramBrandedSec = 0;
  let personalChatSec = 0;
  let maxTelegramBrandedSeg = 0;
  const grouped = new Map<string, number>();

  for (const ev of events) {
    const sec = eventDurationSec(ev);
    if (sec <= 0) continue;
    const appName = typeof ev.appName === "string" ? ev.appName.trim() : "App";
    const winTitle = typeof ev.title === "string" ? ev.title.trim() : "";

    if (isPersonalChatEvent(appName, winTitle)) personalChatSec += sec;
    if (/telegram/i.test(appName) && isTelegramBrandedTitle(winTitle)) {
      telegramBrandedSec += sec;
      maxTelegramBrandedSeg = Math.max(maxTelegramBrandedSeg, sec);
    }
    if (/^study$/i.test(winTitle)) studyTitleSec += sec;

    const label = normalizeEventLabel(labelFromEventRow(ev), appName);
    grouped.set(label, (grouped.get(label) ?? 0) + sec);
  }

  const chromeAppSec = readAppSeconds(apps, /chrome/i);
  const telegramAppSec = readAppSeconds(apps, /telegram/i);
  const appsTotalSec = readAppsTotalSec(apps);
  const telegramHeavy = isTelegramHeavyBlock(
    entryDurationSec,
    personalChatSec,
    telegramAppSec
  );

  // Rize % denominator: apps total for normal blocks; adjusted pool for telegram-heavy.
  const titlePool = telegramHeavy
    ? entryDurationSec -
      personalChatSec +
      Math.max(0, telegramBrandedSec - chromeAppSec)
    : appsTotalSec > 0
      ? appsTotalSec
      : entryDurationSec;

  const totalSec = titlePool > 0 ? titlePool : entryDurationSec;

  const shares: RizeTitleShare[] = [];
  const used = new Set<string>();

  const pushShare = (label: string, timeSec: number) => {
    const key = label.toLowerCase();
    if (used.has(key)) return;
    const percent = totalSec > 0 ? (timeSec / totalSec) * 100 : 0;
    if (shouldShowTitleShare(label, timeSec, percent)) {
      shares.push({ label, percent });
      used.add(key);
    }
  };

  if (telegramHeavy) {
    if (studyTitleSec > 0) pushShare("Study", studyTitleSec);
    const telegramNumer = resolveTelegramHeavyNumerator(
      maxTelegramBrandedSeg,
      studyTitleSec,
      chromeAppSec,
      telegramAppSec
    );
    if (telegramNumer > 0) pushShare("Telegram", telegramNumer);
    for (const [label, timeSec] of grouped) {
      if (/^study$/i.test(label) || /^telegram$/i.test(label)) continue;
      pushShare(label, timeSec);
    }
  } else {
    for (const [label, timeSec] of grouped) {
      pushShare(label, timeSec);
    }
  }

  if (shares.length === 0) {
    return sharesFromGroupedSeconds(grouped, entryDurationSec);
  }

  shares.sort((a, b) => b.percent - a.percent);
  return shares;
}

/** Raw tracking events often carry real window titles (Rize Titles tab). */
export function buildTitleBreakdownFromEvents(
  events: Record<string, unknown>[],
  durationSec: number
): RizeTitleShare[] {
  if (events.length === 0 || durationSec <= 0) return [];

  const grouped = new Map<string, number>();
  for (const ev of events) {
    const start = typeof ev.startTime === "string" ? new Date(ev.startTime).getTime() : 0;
    const end = typeof ev.endTime === "string" ? new Date(ev.endTime).getTime() : 0;
    const sec = Math.max(0, Math.round((end - start) / 1000));
    if (sec <= 0) continue;
    const label = labelFromEventRow(ev);
    grouped.set(label, (grouped.get(label) ?? 0) + sec);
  }

  return sharesFromGroupedSeconds(grouped, durationSec);
}

function normalizeGroupedSeconds(
  grouped: Map<string, number>,
  wallClockSec: number
): Map<string, number> {
  const tracked = [...grouped.values()].reduce((sum, sec) => sum + sec, 0);
  if (tracked <= 0) return grouped;
  if (wallClockSec > 0 && tracked > wallClockSec * 1.02) {
    const scale = wallClockSec / tracked;
    const scaled = new Map<string, number>();
    for (const [label, sec] of grouped) {
      scaled.set(label, sec * scale);
    }
    return scaled;
  }
  return grouped;
}

function isIgnorableTitleLabel(label: string): boolean {
  return /^(search host|shell experience host|windows input experience|lock screen|start menu|unknown)$/i.test(
    label.trim()
  );
}

function shouldShowTitleShare(label: string, timeSec: number, percent: number): boolean {
  if (percent < MIN_TITLE_SHARE_PERCENT) return false;
  if (isIgnorableTitleLabel(label)) return false;
  // Brief Telegram flicker under 1 min (e.g. 45 s at 4:14).
  if (/telegram/i.test(label) && timeSec < 60) return false;
  return true;
}

function isTelegramHeavyBlock(
  entryDurationSec: number,
  personalChatSec: number,
  telegramAppSec: number
): boolean {
  return (
    telegramAppSec >= entryDurationSec * 0.2 && personalChatSec >= 60
  );
}

function resolveTelegramHeavyNumerator(
  maxTelegramBrandedSeg: number,
  studyTitleSec: number,
  chromeAppSec: number,
  telegramAppSec: number
): number {
  const scaledTelegramSec =
    studyTitleSec > 0 && chromeAppSec > 0 && telegramAppSec > 0
      ? (telegramAppSec * chromeAppSec) / (studyTitleSec + chromeAppSec + telegramAppSec)
      : 0;
  if (maxTelegramBrandedSeg >= MIN_TELEGRAM_TITLE_SEC) return maxTelegramBrandedSeg;
  if (scaledTelegramSec >= 60) return scaledTelegramSec;
  return 0;
}

function sharesFromGroupedSeconds(
  grouped: Map<string, number>,
  durationSec: number
): RizeTitleShare[] {
  const normalized = normalizeGroupedSeconds(grouped, durationSec);
  const trackedSec = [...normalized.values()].reduce((sum, sec) => sum + sec, 0);
  // Match Rize Titles tab: percents are of tracked activity, not the full block span.
  const totalSec = trackedSec > 0 ? trackedSec : durationSec;
  const shares: RizeTitleShare[] = [];
  for (const [label, timeSec] of normalized) {
    const percent = totalSec > 0 ? (timeSec / totalSec) * 100 : 0;
    if (shouldShowTitleShare(label, timeSec, percent)) {
      shares.push({ label, percent });
    }
  }
  shares.sort((a, b) => b.percent - a.percent);
  return shares;
}

export function mergeTitleBreakdownShares(shares: RizeTitleShare[]): RizeTitleShare[] {
  const grouped = new Map<string, number>();
  for (const s of shares) {
    grouped.set(s.label, (grouped.get(s.label) ?? 0) + s.percent);
  }
  const merged = [...grouped.entries()]
    .map(([label, percent]) => ({ label, percent }))
    .filter((s) => s.percent >= MIN_TITLE_SHARE_PERCENT)
    .sort((a, b) => b.percent - a.percent);
  return merged;
}

/** When API hides tab titles, infer Study from browser share + entry summary. */
export function applyStudyHeuristic(
  shares: RizeTitleShare[],
  entrySummary?: string | null
): RizeTitleShare[] {
  if (!entrySummary?.trim()) return shares;
  if (shares.some((s) => /^study$/i.test(s.label))) return shares;
  const hay = entrySummary.toLowerCase();
  if (!/\bstudy\b|studied|research|learning|education|course/.test(hay)) return shares;

  const mapped = shares.map((s) => {
    if (/^(google chrome|chrome|microsoft edge|edge|firefox|browser)$/i.test(s.label)) {
      return { ...s, label: "Study" };
    }
    return s;
  });
  return mergeTitleBreakdownShares(mapped);
}

function labelFromTrackingRow(winTitle: string, appName: string, url: string): string {
  const hay = `${winTitle} ${url} ${appName}`.toLowerCase();

  if (/\bstudy\b|learning|course|lesson|udemy|coursera|education|analyst/.test(hay)) {
    return "Study";
  }

  if (winTitle && winTitle.toLowerCase() !== appName.toLowerCase()) {
    const short = winTitle.split(/[|\-—–]/)[0]?.trim() ?? winTitle;
    if (short.length > 0 && short.length <= 48) return simplifyRizeTitleLabel(short);
  }

  if (/telegram|t\.me/.test(hay) && /telegram/i.test(appName)) return "Telegram";
  if (/\bcursor\b/.test(hay) && /\bcursor\b/i.test(appName)) return "Cursor";
  if (/dashboard/.test(hay)) return "Dashboard";

  if (/telegram/i.test(appName)) return "Telegram";
  if (/\bcursor\b/i.test(appName)) return "Cursor";

  return simplifyRizeTitleLabel(appName);
}

function labelFromAppRow(raw: Record<string, unknown>): string {
  const appName = typeof raw.appName === "string" ? raw.appName.trim() : "App";
  const winTitle = typeof raw.title === "string" ? raw.title.trim() : "";
  const url =
    (typeof raw.url === "string" ? raw.url : "") ||
    (typeof raw.urlHost === "string" ? raw.urlHost : "");
  return labelFromTrackingRow(winTitle, appName, url);
}

function labelFromEventRow(raw: Record<string, unknown>): string {
  const appName = typeof raw.appName === "string" ? raw.appName.trim() : "App";
  const winTitle = typeof raw.title === "string" ? raw.title.trim() : "";
  const url = typeof raw.url === "string" ? raw.url : "";
  return labelFromTrackingRow(winTitle, appName, url);
}

function trackingEventsHaveDistinctTitles(events: Record<string, unknown>[]): boolean {
  return events.some((ev) => {
    const appName = typeof ev.appName === "string" ? ev.appName.trim().toLowerCase() : "";
    const winTitle = typeof ev.title === "string" ? ev.title.trim().toLowerCase() : "";
    return winTitle.length > 0 && winTitle !== appName;
  });
}

function syntheticTitlesFromBreakdown(shares: RizeTitleShare[]): Record<string, unknown>[] {
  return shares.map((s) => ({ title: s.label, percentage: s.percent }));
}

function parseGenericTimeEntry(
  raw: Record<string, unknown>,
  kind: RizeEntryKind,
  idPrefix: string
): RizeTimeEntry | null {
  if (isRejectedStatus(raw.status)) return null;
  const startTime = raw.startTime;
  const endTime = raw.endTime;
  if (typeof startTime !== "string" || typeof endTime !== "string") return null;

  const project = (raw.project as Record<string, unknown> | null) ?? {};
  const task = (raw.task as Record<string, unknown> | null) ?? {};
  const taskProject = (task.project as Record<string, unknown> | null) ?? {};
  const client =
    (raw.client as Record<string, unknown> | null) ??
    (project.client as Record<string, unknown> | null) ??
    (taskProject.client as Record<string, unknown> | null);

  const title = typeof raw.title === "string" ? raw.title.trim() : null;
  const description =
    typeof raw.description === "string" ? raw.description.trim() : null;
  const projectTag = pickName(project) ?? pickName(task);
  const durationSec = rawDurationSec(raw, startTime, endTime);
  const titleBreakdown = parseTitleBreakdownFromRaw(raw, durationSec);
  const entryTitle = title ?? description ?? null;

  const projectName = projectTag ?? "Activity";

  const duration =
    typeof raw.duration === "number"
      ? raw.duration
      : typeof raw.duration === "string"
        ? Number.parseFloat(raw.duration)
        : null;

  return {
    id: `${idPrefix}_${String(raw.id)}`,
    description: entryTitle,
    duration: Number.isFinite(duration) ? duration : null,
    startTime,
    endTime,
    source: kind,
    projectName,
    clientName: pickName(client),
    entryTitle,
    titleBreakdown: titleBreakdown.length > 0 ? titleBreakdown : undefined,
    kind,
    status: typeof raw.status === "string" ? raw.status : null,
  };
}

function parseSessionEntry(raw: Record<string, unknown>): RizeTimeEntry | null {
  const startTime = raw.startTime;
  const endTime = raw.endTime;
  if (typeof startTime !== "string" || typeof endTime !== "string") return null;

  const sessionTypeRaw = raw.type ?? raw.sessionType;
  const sessionType =
    typeof sessionTypeRaw === "string" ? sessionTypeRaw.toLowerCase() : "focus";
  const title = typeof raw.title === "string" ? raw.title : null;
  const projects = Array.isArray(raw.projects) ? raw.projects : [];
  const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
  const projectName =
    pickName(projects[0] as Record<string, unknown>) ??
    pickName(tasks[0] as Record<string, unknown>) ??
    title ??
    sessionTypeLabel(sessionType);

  return {
    id: `session_${String(raw.id)}`,
    description: typeof raw.description === "string" ? raw.description : sessionType,
    duration: null,
    startTime,
    endTime,
    source: "session",
    projectName,
    clientName: null,
    kind: "session",
  };
}

function sessionTypeLabel(sessionType: string): string {
  if (sessionType === "break") return "Break";
  if (sessionType === "meeting") return "Meeting";
  return "Focus";
}

function numField(raw: Record<string, unknown>, key: string): number {
  const v = raw[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Rize APIs mix seconds, minutes, or ms — infer from magnitude. */
export function normalizeRizeSeconds(raw: number, peerValues: number[] = []): number {
  if (raw <= 0) return 0;
  const peers = peerValues.filter((v) => v > 0);
  const maxPeer = peers.length ? Math.max(...peers) : raw;

  // Milliseconds (e.g. 180_000 = 3 min, 3_600_000 = 1 h)
  if (maxPeer >= 10_000 && maxPeer <= 86_400_000) {
    return Math.round(raw / 1000);
  }
  // Minutes (typical small integers: 5, 45, 120)
  if (maxPeer > 0 && maxPeer <= 480) {
    return Math.round(raw * 60);
  }
  // Already seconds (e.g. 600, 3600, 7200)
  return Math.round(raw);
}

function readTimeSpent(raw: Record<string, unknown>): number {
  return (
    numField(raw, "timeSpent") ||
    numField(raw, "time_spent") ||
    numField(raw, "duration") ||
    numField(raw, "totalTime")
  );
}

function appDisplayName(raw: Record<string, unknown>): string {
  const appName = typeof raw.appName === "string" ? raw.appName.trim() : "App";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (title && title.toLowerCase() !== appName.toLowerCase()) {
    const short = title.length > 50 ? `${title.slice(0, 47)}…` : title;
    return `${appName} — ${short}`;
  }
  return appName;
}

function buildAppUsageEntries(
  apps: Record<string, unknown>[],
  dayWindow: RizeSyncWindow,
  dayKey: string,
  totalSecondsBudget?: number
): RizeTimeEntry[] {
  const rawSpent = apps.map((a) => readTimeSpent(a));
  let ranked = apps
    .map((raw, i) => ({
      raw,
      name: appDisplayName(raw),
      seconds: normalizeRizeSeconds(rawSpent[i] ?? 0, rawSpent),
      category: pickName(raw.timeCategory as Record<string, unknown>),
    }))
    .filter((a) => a.seconds >= 15)
    .sort((a, b) => b.seconds - a.seconds);

  if (ranked.length === 0 && apps.length > 0 && totalSecondsBudget && totalSecondsBudget >= 60) {
    const share = Math.max(60, Math.floor(totalSecondsBudget / Math.min(apps.length, 12)));
    ranked = apps.slice(0, 12).map((raw, i) => ({
      raw,
      name: appDisplayName(raw),
      seconds: share,
      category: pickName(raw.timeCategory as Record<string, unknown>),
    }));
  }

  if (ranked.length === 0) return [];

  const cursor = new Date(dayWindow.start);
  if (cursor.getHours() < 6) cursor.setHours(8, 0, 0, 0);

  const entries: RizeTimeEntry[] = [];
  for (const app of ranked) {
    const start = new Date(cursor);
    const endMs = start.getTime() + app.seconds * 1000;
    if (endMs > dayWindow.end.getTime() + 60_000) break;

    entries.push({
      id: `app_${dayKey}_${entries.length}_${app.name.slice(0, 24).replace(/\W/g, "_")}`,
      description: `${Math.max(1, Math.round(app.seconds / 60))} min`,
      duration: app.seconds,
      startTime: toRizeIso(start),
      endTime: toRizeIso(new Date(endMs)),
      source: "apps",
      projectName: app.name,
      clientName: app.category,
      kind: "summary",
    });
    cursor.setTime(endMs);
  }

  return entries;
}

async function fetchAppsList(
  apiKey: string,
  window: RizeSyncWindow,
  probeErrors: string[]
): Promise<Record<string, unknown>[]> {
  const variables = {
    startTime: toRizeIso(window.start),
    endTime: toRizeIso(window.end),
  };
  const rich = await tryQueryList<{ appsAndWebsites?: Record<string, unknown>[] }>(
    apiKey,
    "appsAndWebsites",
    QUERIES.appsAndWebsites,
    variables,
    "appsAndWebsites",
    probeErrors
  );
  if (rich.length > 0) return rich;
  return tryQueryList<{ appsAndWebsites?: Record<string, unknown>[] }>(
    apiKey,
    "appsAndWebsites plain",
    QUERIES.appsAndWebsitesPlain,
    variables,
    "appsAndWebsites",
    probeErrors
  );
}

function buildCategoryUsageEntries(
  categories: Record<string, unknown>[],
  dayWindow: RizeSyncWindow,
  dayKey: string
): RizeTimeEntry[] {
  const rawSpent = categories.map((c) => readTimeSpent(c));
  const ranked = categories
    .map((raw, i) => {
      const cat = (raw.category as Record<string, unknown> | null) ?? {};
      const name = pickName(cat) ?? "Activity";
      return {
        name,
        seconds: normalizeRizeSeconds(rawSpent[i] ?? 0, rawSpent),
      };
    })
    .filter((c) => c.seconds >= 60)
    .sort((a, b) => b.seconds - a.seconds);

  if (ranked.length === 0) return [];

  const cursor = new Date(dayWindow.start);
  if (cursor.getHours() < 6) cursor.setHours(8, 0, 0, 0);

  const entries: RizeTimeEntry[] = [];
  for (const cat of ranked) {
    const start = new Date(cursor);
    const endMs = start.getTime() + cat.seconds * 1000;
    if (endMs > dayWindow.end.getTime() + 60_000) break;

    entries.push({
      id: `cat_${dayKey}_${entries.length}_${cat.name.slice(0, 20).replace(/\W/g, "_")}`,
      description: `${Math.max(1, Math.round(cat.seconds / 60))} min`,
      duration: cat.seconds,
      startTime: toRizeIso(start),
      endTime: toRizeIso(new Date(endMs)),
      source: "categories",
      projectName: cat.name,
      clientName: null,
      kind: "summary",
    });
    cursor.setTime(endMs);
  }
  return entries;
}

async function fetchTotalSummaryEntry(
  apiKey: string,
  window: RizeSyncWindow,
  probeErrors: string[]
): Promise<RizeTimeEntry | null> {
  const variables = {
    startTime: toRizeIso(window.start),
    endTime: toRizeIso(window.end),
  };
  const { data, errors } = await rizeGraphql<{ summary?: Record<string, unknown> }>(
    apiKey,
    QUERIES.summaryTotal,
    variables
  );
  if (errors.length || !data?.summary) {
    if (errors[0]) probeErrors.push(`summary: ${errors[0]}`);
    return null;
  }

  const s = data.summary;
  const rawValues = [
    numField(s, "totalTime"),
    numField(s, "focusTime"),
    numField(s, "meetingTime"),
    numField(s, "breakTime"),
  ];
  const tracked = Math.max(
    normalizeRizeSeconds(rawValues[0], rawValues),
    normalizeRizeSeconds(rawValues[1], rawValues),
    normalizeRizeSeconds(rawValues[2], rawValues),
    normalizeRizeSeconds(rawValues[3], rawValues)
  );
  if (tracked < 30) return null;

  const end = window.end;
  const start = new Date(end.getTime() - tracked * 1000);
  const focus = normalizeRizeSeconds(numField(s, "focusTime"), rawValues);
  const label = focus >= tracked * 0.4 ? "Focus time (Rize)" : "Tracked activity (Rize)";

  return {
    id: `summary_total_${toDateOnly(end)}`,
    description: `${Math.max(1, Math.round(tracked / 60))} min total`,
    duration: tracked,
    startTime: toRizeIso(start),
    endTime: toRizeIso(end),
    source: "summary",
    projectName: label,
    clientName: null,
    kind: "summary",
  };
}

async function appendActivityFallbacks(
  apiKey: string,
  window: RizeSyncWindow,
  merged: RizeTimeEntry[],
  sources: string[],
  probeErrors: string[],
  appsInWindow: Record<string, unknown>[]
): Promise<{ summaries: number; appBlocks: number; categoryBlocks: number; topAppMinutes?: number }> {
  if (filterEntriesInWindow(merged, window).length > 0) {
    return { summaries: 0, appBlocks: 0, categoryBlocks: 0 };
  }

  let summaries = 0;
  let appBlocks = 0;
  let categoryBlocks = 0;
  let topAppMinutes: number | undefined;

  const summaryEntries = filterEntriesInWindow(
    await fetchSummaryEntries(apiKey, window, probeErrors),
    window
  );
  for (const entry of summaryEntries) merged.push(entry);
  summaries = summaryEntries.length;
  if (summaries > 0) sources.push("summaries");

  const todayWindow = resolveTodayWindow();

  if (merged.length === 0) {
    const total = await fetchTotalSummaryEntry(apiKey, todayWindow, probeErrors);
    if (total) {
      merged.push(total);
      summaries = 1;
      sources.push("summaryTotal");
    }
  }

  const todayApps =
    appsInWindow.length > 0
      ? appsInWindow
      : await fetchAppsList(apiKey, todayWindow, probeErrors);

  if (merged.length === 0) {
    const categories = await tryQueryList<{ categories?: Record<string, unknown>[] }>(
      apiKey,
      "categories",
      QUERIES.categories,
      {
        startTime: toRizeIso(todayWindow.start),
        endTime: toRizeIso(todayWindow.end),
      },
      "categories",
      probeErrors
    );
    const catEntries = buildCategoryUsageEntries(
      categories,
      todayWindow,
      toDateOnly(todayWindow.end)
    );
    for (const entry of catEntries) merged.push(entry);
    categoryBlocks = catEntries.length;
    if (categoryBlocks > 0) sources.push("categories");
  }

  let totalSecondsBudget: number | undefined;
  if (merged.length === 0 && todayApps.length > 0) {
    const total = await fetchTotalSummaryEntry(apiKey, todayWindow, probeErrors);
    if (total?.duration) totalSecondsBudget = total.duration;
  }

  if (merged.length === 0 && todayApps.length > 0) {
    const rawSpent = todayApps.map((a) => readTimeSpent(a));
    const topRaw = Math.max(...rawSpent.filter((v) => v > 0), 0);
    if (topRaw > 0) {
      topAppMinutes = Math.max(1, Math.round(normalizeRizeSeconds(topRaw, rawSpent) / 60));
    }

    const appEntries = buildAppUsageEntries(
      todayApps,
      todayWindow,
      toDateOnly(todayWindow.end),
      totalSecondsBudget
    );
    for (const entry of appEntries) merged.push(entry);
    appBlocks = appEntries.length;
    if (appBlocks > 0) sources.push("apps");
  }

  return { summaries, appBlocks, categoryBlocks, topAppMinutes };
}

function parseSummaryBucket(raw: Record<string, unknown>): RizeTimeEntry | null {
  const startTime = raw.startTime;
  const endTime = raw.endTime;
  if (typeof startTime !== "string" || typeof endTime !== "string") return null;

  const tracked = numField(raw, "trackedTime");
  const focus = numField(raw, "focusTime");
  const meeting = numField(raw, "meetingTime");
  const breakTime = numField(raw, "breakTime");
  const peers = [tracked, focus, meeting, breakTime];
  const active = Math.max(
    normalizeRizeSeconds(tracked, peers),
    normalizeRizeSeconds(focus, peers),
    normalizeRizeSeconds(meeting, peers),
    normalizeRizeSeconds(breakTime, peers)
  );
  if (active < 30) return null;

  let label = "Tracked activity";
  let categoryHint = "tracked";
  if (focus >= tracked * 0.5 && focus >= meeting) {
    label = "Focus time";
    categoryHint = "focus";
  } else if (meeting > focus && meeting > breakTime) {
    label = "Meetings";
    categoryHint = "meeting";
  } else if (breakTime > focus) {
    label = "Break";
    categoryHint = "break";
  }

  const mins = Math.round(active / 60);
  return {
    id: `summary_${startTime}`,
    description: `${mins} min`,
    duration: active,
    startTime,
    endTime,
    source: "summary",
    projectName: label,
    clientName: null,
    kind: "summary",
    status: categoryHint,
  };
}

async function fetchSummaryEntries(
  apiKey: string,
  window: RizeSyncWindow,
  probeErrors: string[]
): Promise<RizeTimeEntry[]> {
  const variables = {
    startDate: toDateOnly(window.start),
    endDate: toDateOnly(window.end),
    bucketSize: "hour",
  };

  for (const bucketSize of SUMMARY_BUCKET_SIZES) {
    const rows = await tryQueryList<{ summaries?: Record<string, unknown>[] }>(
      apiKey,
      `summaries(${bucketSize})`,
      QUERIES.summaries,
      { ...variables, bucketSize },
      "summaries",
      probeErrors
    );
    const parsed = rows.map(parseSummaryBucket).filter((e): e is RizeTimeEntry => e != null);
    if (parsed.length > 0) return parsed;
  }
  return [];
}

async function tryQueryList<T>(
  apiKey: string,
  label: string,
  query: string,
  variables: Record<string, unknown>,
  path: keyof T,
  probeErrors: string[]
): Promise<Record<string, unknown>[]> {
  const { data, errors } = await rizeGraphql<T>(apiKey, query, variables);
  if (errors.length) {
    probeErrors.push(`${label}: ${errors[0]}`);
    return [];
  }
  const list = data?.[path];
  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
}

function extractConnectionNodes(data: Record<string, unknown> | null, field: string): Record<string, unknown>[] {
  if (!data) return [];
  const conn = data[field];
  if (Array.isArray(conn)) return conn as Record<string, unknown>[];
  if (conn && typeof conn === "object" && "edges" in conn) {
    const edges = (conn as { edges?: { node?: Record<string, unknown> }[] }).edges ?? [];
    return edges.map((e) => e.node).filter((n): n is Record<string, unknown> => !!n);
  }
  return [];
}

function extractTimeEntryNodes(data: Record<string, unknown> | null, field: string): Record<string, unknown>[] {
  if (!data) return [];
  const conn = data[field];
  if (Array.isArray(conn)) return conn as Record<string, unknown>[];
  if (conn && typeof conn === "object") {
    const c = conn as {
      nodes?: Record<string, unknown>[];
      edges?: { node?: Record<string, unknown> }[];
    };
    if (Array.isArray(c.nodes) && c.nodes.length > 0) {
      return c.nodes.filter((n): n is Record<string, unknown> => !!n);
    }
    return extractConnectionNodes(data, field);
  }
  return [];
}

async function tryQueryConnection(
  apiKey: string,
  label: string,
  query: string,
  variables: Record<string, unknown>,
  field: string,
  probeErrors: string[]
): Promise<Record<string, unknown>[]> {
  const { data, errors } = await rizeGraphql<Record<string, unknown>>(apiKey, query, variables);
  if (errors.length) {
    probeErrors.push(`${label}: ${errors[0]}`);
    return [];
  }
  return extractTimeEntryNodes(data, field);
}

const TIME_ENTRY_STATUS_LISTS: (string[] | undefined)[] = [
  ["active", "pending", "generating", "tracking", "live", "approved"],
  ["ACTIVE", "PENDING", "GENERATING", "TRACKING", "LIVE", "APPROVED"],
  undefined,
];

/** Share of [s,e] not covered by existing ranges (0 = fully covered, 1 = empty). */
function uncoveredFraction(
  s: number,
  e: number,
  ranges: { start: number; end: number }[]
): number {
  const total = e - s;
  if (total <= 0) return 0;
  let covered = 0;
  for (const r of ranges) {
    const oStart = Math.max(s, r.start);
    const oEnd = Math.min(e, r.end);
    if (oEnd > oStart) covered += oEnd - oStart;
  }
  return Math.max(0, total - covered) / total;
}

/** Hourly Rize summaries for hours not covered by real time entries (e.g. evening). */
async function fillGapSummaries(
  apiKey: string,
  window: RizeSyncWindow,
  merged: RizeTimeEntry[],
  probeErrors: string[]
): Promise<number> {
  let added = 0;
  const existing = merged.map((e) => ({
    start: new Date(e.startTime).getTime(),
    end: new Date(e.endTime).getTime(),
  }));

  for (const day of enumerateLocalDays(window)) {
    const summaries = await fetchSummaryEntries(apiKey, day, probeErrors);
    for (const summary of summaries) {
      const s = new Date(summary.startTime).getTime();
      const e = new Date(summary.endTime).getTime();
      if (e <= s) continue;
      // Add hour if mostly uncovered (fixes evening gaps when day has partial entries).
      if (uncoveredFraction(s, e, existing) < 0.25) continue;
      if (merged.some((m) => m.id === summary.id)) continue;
      merged.push(summary);
      existing.push({ start: s, end: e });
      added++;
    }
  }
  return added;
}

function enumerateLocalDays(window: RizeSyncWindow): RizeSyncWindow[] {
  const days: RizeSyncWindow[] = [];
  const cursor = new Date(window.start);
  cursor.setHours(0, 0, 0, 0);
  const limit = new Date(window.end);
  const now = new Date();

  while (cursor <= limit) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setHours(23, 59, 59, 999);
    if (start > now) break;
    if (end > now) end.setTime(now.getTime());
    days.push({ start, end });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

async function fetchPrimaryTimeEntries(
  apiKey: string,
  window: RizeSyncWindow,
  probeErrors: string[]
): Promise<Record<string, unknown>[]> {
  const seen = new Set<string>();
  const all: Record<string, unknown>[] = [];
  const first = 500;

  const add = (rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      all.push(row);
    }
  };

  const windowVars = {
    startTime: toRizeIso(window.start),
    endTime: toRizeIso(window.end),
    first,
  };

  add(
    await tryQueryConnection(
      apiKey,
      "timeEntries",
      QUERIES.timeEntriesConnection,
      windowVars,
      "timeEntries",
      probeErrors
    )
  );

  for (const statuses of TIME_ENTRY_STATUS_LISTS.filter(Boolean) as string[][]) {
    add(
      await tryQueryConnection(
        apiKey,
        `timeEntries[${statuses.join(",")}]`,
        QUERIES.timeEntriesConnectionStatuses,
        { ...windowVars, statuses },
        "timeEntries",
        probeErrors
      )
    );
  }

  for (const day of enumerateLocalDays(window)) {
    const dayVars = {
      startTime: toRizeIso(day.start),
      endTime: toRizeIso(day.end),
      first,
    };
    const dateStr = toDateOnly(day.start);

    add(
      await tryQueryConnection(
        apiKey,
        `timeEntries@${dateStr}`,
        QUERIES.timeEntriesConnection,
        dayVars,
        "timeEntries",
        probeErrors
      )
    );

    for (const statuses of TIME_ENTRY_STATUS_LISTS.filter(Boolean) as string[][]) {
      add(
        await tryQueryConnection(
          apiKey,
          `timeEntries@${dateStr}[${statuses.join(",")}]`,
          QUERIES.timeEntriesConnectionStatuses,
          { ...dayVars, statuses },
          "timeEntries",
          probeErrors
        )
      );
    }
  }

  await enrichRawWithAppsTitleBreakdown(apiKey, all, probeErrors);
  return all;
}

const trackingWindowCache = new Map<string, Record<string, unknown>[]>();

async function fetchTrackingEventsForWindow(
  apiKey: string,
  startTime: string,
  endTime: string,
  probeErrors: string[]
): Promise<Record<string, unknown>[]> {
  const key = `ev|${startTime}|${endTime}`;
  const cached = trackingWindowCache.get(key);
  if (cached) return cached;

  const rows = await tryQueryConnection(
    apiKey,
    "events",
    QUERIES.trackingEventsConnection,
    { startTime, endTime, first: 500 },
    "events",
    probeErrors
  );
  trackingWindowCache.set(key, rows);
  return rows;
}

async function fetchAppsForWindow(
  apiKey: string,
  startTime: string,
  endTime: string,
  probeErrors: string[]
): Promise<Record<string, unknown>[]> {
  const key = `app|${startTime}|${endTime}`;
  const cached = trackingWindowCache.get(key);
  if (cached) return cached;

  const variables = { startTime, endTime };
  let rows = await tryQueryList<{ appsAndWebsites?: Record<string, unknown>[] }>(
    apiKey,
    "appsAndWebsites",
    QUERIES.appsAndWebsites,
    variables,
    "appsAndWebsites",
    probeErrors
  );
  if (rows.length === 0) {
    rows = await tryQueryList<{ appsAndWebsites?: Record<string, unknown>[] }>(
      apiKey,
      "appsAndWebsites plain",
      QUERIES.appsAndWebsitesPlain,
      variables,
      "appsAndWebsites",
      probeErrors
    );
  }
  trackingWindowCache.set(key, rows);
  return rows;
}

async function buildTitleBreakdownForEntry(
  apiKey: string,
  row: Record<string, unknown>,
  startTime: string,
  endTime: string,
  probeErrors: string[]
): Promise<RizeTitleShare[]> {
  const durationSec = rawDurationSec(row, startTime, endTime);
  if (durationSec <= 0) return [];

  const [apps, events] = await Promise.all([
    fetchAppsForWindow(apiKey, startTime, endTime, probeErrors),
    fetchTrackingEventsForWindow(apiKey, startTime, endTime, probeErrors),
  ]);

  // Window titles from `events` (Study, Telegram chats) match Rize Titles; apps only have app names.
  let breakdown: RizeTitleShare[] = [];
  if (events.length > 0 && trackingEventsHaveDistinctTitles(events)) {
    breakdown = buildTitleBreakdownFromEventsAndApps(events, apps, durationSec);
  } else if (apps.length > 0) {
    breakdown = buildTitleBreakdownFromApps(apps, durationSec);
  } else if (events.length > 0) {
    breakdown = buildTitleBreakdownFromEvents(events, durationSec);
  }

  const summary =
    (typeof row.title === "string" ? row.title : null) ??
    (typeof row.description === "string" ? row.description : null);
  return applyStudyHeuristic(breakdown, summary);
}

async function enrichRawWithAppsTitleBreakdown(
  apiKey: string,
  rows: Record<string, unknown>[],
  probeErrors: string[]
): Promise<void> {
  if (rows.length === 0) return;
  trackingWindowCache.clear();

  const queue = [...rows];
  const workers = Array.from({ length: Math.min(6, rows.length) }, async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) break;
      const startTime = row.startTime;
      const endTime = row.endTime;
      if (typeof startTime !== "string" || typeof endTime !== "string") continue;
      if (Array.isArray(row.titles) && row.titles.length > 0) continue;

      const breakdown = await buildTitleBreakdownForEntry(
        apiKey,
        row,
        startTime,
        endTime,
        probeErrors
      );
      if (breakdown.length > 0) {
        row.titles = syntheticTitlesFromBreakdown(breakdown);
      }
    }
  });
  await Promise.all(workers);
}

export function rizeCategoryFromProject(
  projectName: string | null,
  description: string | null,
  titleBreakdown?: RizeTitleShare[] | null
): EventCategory {
  const labels = titleBreakdown?.map((t) => t.label).join(" ").toLowerCase() ?? "";
  if (/study|training|research|learn|english|course|education|reading/.test(labels)) {
    return "learning";
  }

  const tag = (projectName ?? "").toLowerCase();
  if (/training|research|study|learn|english|course|education|reading/.test(tag)) return "learning";
  if (/health|gym|massage|yoga|walk|doctor|sleep/.test(tag)) return "health";
  if (/meal|lunch|dinner|breakfast|cook|food/.test(tag)) return "meal";
  if (/rest|break|relax|read fiction|game/.test(tag)) return "rest";
  if (/commute|travel|drive|metro|bus/.test(tag)) return "commute";

  const hay = `${projectName ?? ""} ${description ?? ""}`.toLowerCase();
  if (/training|research|study|learn|english|course|education|reading|studied|researched|explored/.test(hay))
    return "learning";
  if (/cursor|vscode|code|github|terminal|figma|notion|slack|discord|chrome|firefox|edge/.test(hay))
    return "work";
  if (/work|job|career|client|meeting|dev|focus|tracked|activity/.test(hay)) return "work";
  if (/health|gym|massage|yoga|walk|doctor|sleep/.test(hay)) return "health";
  if (/meal|lunch|dinner|breakfast|cook|food/.test(hay)) return "meal";
  if (/rest|break|relax|read fiction|game/.test(hay)) return "rest";
  if (/commute|travel|drive|metro|bus/.test(hay)) return "commute";
  return "other";
}

export function rizeTrackFromProject(projectName: string | null): string | undefined {
  if (!projectName) return undefined;
  const lower = projectName.toLowerCase();
  if (/english|language/.test(lower)) return "english";
  if (/program|code|dev/.test(lower)) return "programming";
  if (/\bml\b|machine learning/.test(lower)) return "ml";
  return undefined;
}

export function buildRizeEventTitle(entry: RizeTimeEntry): string {
  if (entry.titleBreakdown && entry.titleBreakdown.length > 0) {
    return formatTitleBreakdown(entry.titleBreakdown);
  }

  const tag = entry.projectName?.trim();
  if (tag && tag !== "Activity") {
    if (entry.kind === "session") return `${tag} session`;
    return tag;
  }
  if (entry.kind === "session") return "Focus session";
  return "Activity";
}

export function rizeIsoToNaive(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00`;
}

export function entryDurationMs(entry: RizeTimeEntry): number {
  const start = new Date(entry.startTime).getTime();
  const end = new Date(entry.endTime).getTime();
  const fromRange = Math.max(0, end - start);
  if (fromRange > 0) return fromRange;

  if (entry.duration != null && entry.duration > 0) {
    return normalizeRizeSeconds(entry.duration, [entry.duration]) * 1000;
  }
  return 0;
}

export function mapRizeEntryToCalendarEvent(entry: RizeTimeEntry): RizeCalendarEvent | null {
  const minMs =
    entry.kind === "summary" || entry.source === "apps" || entry.source === "categories"
      ? 30_000
      : MIN_RIZE_ENTRY_MS;
  if (entryDurationMs(entry) < minMs) return null;

  const notes: string[] = [`Rize ${entry.kind}`];
  if (entry.status) notes.push(`Status: ${entry.status}`);
  if (entry.projectName && entry.projectName !== "Activity") {
    notes.push(`Project: ${entry.projectName}`);
  }
  if (entry.entryTitle?.trim()) {
    notes.push(`Summary: ${entry.entryTitle.trim()}`);
  }
  if (entry.clientName) notes.push(`Client: ${entry.clientName}`);

  return {
    rizeEntryId: entry.id,
    title: buildRizeEventTitle(entry),
    category: rizeCategoryFromProject(
      entry.projectName,
      entry.entryTitle ?? entry.description,
      entry.titleBreakdown
    ),
    start: rizeIsoToNaive(entry.startTime),
    end: rizeIsoToNaive(entry.endTime),
    track: rizeTrackFromProject(entry.projectName),
    notes: notes.join("\n"),
  };
}

export function filterEntriesInWindow(
  entries: RizeTimeEntry[],
  window: RizeSyncWindow
): RizeTimeEntry[] {
  const startMs = window.start.getTime();
  const endMs = window.end.getTime();
  return entries
    .filter((e) => {
      const s = new Date(e.startTime).getTime();
      const end = new Date(e.endTime).getTime();
      return end > startMs && s < endMs;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export function resolveSyncWindow(
  lookbackHours: number,
  lookaheadDays: number,
  now = new Date()
): RizeSyncWindow {
  const start = new Date(now);
  start.setHours(start.getHours() - lookbackHours);
  const end = new Date(now);
  end.setDate(end.getDate() + lookaheadDays);
  return { start, end };
}

/** Local today 00:00 → now — best window for Rize AI generate. */
export function resolveTodayWindow(now = new Date()): RizeSyncWindow {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

export async function fetchCurrentUser(apiKey: string): Promise<{ email?: string; timezone?: string }> {
  const { data } = await rizeGraphql<{ currentUser?: { email?: string; timezone?: string } }>(
    apiKey,
    QUERIES.currentUser
  );
  return data?.currentUser ?? {};
}

export async function generateRizeTimeEntries(
  apiKey: string,
  window: RizeSyncWindow
): Promise<{ ok: boolean; error?: string }> {
  const variables = {
    startTime: toRizeIso(window.start),
    endTime: toRizeIso(window.end),
  };
  const errors: string[] = [];
  for (const mutation of GENERATE_MUTATIONS) {
    const { data, errors: gqlErrors } = await rizeGraphql<Record<string, unknown>>(
      apiKey,
      mutation,
      variables
    );
    if (gqlErrors.length === 0 && data) return { ok: true };
    errors.push(...gqlErrors);
  }
  return { ok: false, error: errors[0] ?? "Could not trigger Rize AI entry generation" };
}

export async function fetchRizeTimeEntries(
  apiKey: string,
  window: RizeSyncWindow
): Promise<{ entries: RizeTimeEntry[]; stats: RizeFetchStats }> {
  const variables = {
    startTime: toRizeIso(window.start),
    endTime: toRizeIso(window.end),
  };
  const probeErrors: string[] = [];
  const sources: string[] = [];

  const user = await fetchCurrentUser(apiKey);

  const timeEntriesRaw = await fetchPrimaryTimeEntries(apiKey, window, probeErrors);

  const projectRich = await tryQueryList<{ projectTimeEntries?: Record<string, unknown>[] }>(
    apiKey,
    "projectTimeEntries",
    QUERIES.projectTimeEntriesRich,
    variables,
    "projectTimeEntries",
    probeErrors
  );
  const projectPlain =
    projectRich.length > 0
      ? projectRich
      : await tryQueryList<{ projectTimeEntries?: Record<string, unknown>[] }>(
          apiKey,
          "projectTimeEntries plain",
          QUERIES.projectTimeEntriesPlain,
          variables,
          "projectTimeEntries",
          probeErrors
        );

  const taskRich = await tryQueryList<{ taskTimeEntries?: Record<string, unknown>[] }>(
    apiKey,
    "taskTimeEntries",
    QUERIES.taskTimeEntriesRich,
    variables,
    "taskTimeEntries",
    probeErrors
  );
  const taskPlain =
    taskRich.length > 0
      ? taskRich
      : await tryQueryList<{ taskTimeEntries?: Record<string, unknown>[] }>(
          apiKey,
          "taskTimeEntries plain",
          QUERIES.taskTimeEntriesPlain,
          variables,
          "taskTimeEntries",
          probeErrors
        );

  const sessionsRich = await tryQueryList<{ sessions?: Record<string, unknown>[] }>(
    apiKey,
    "sessions",
    QUERIES.sessionsRich,
    variables,
    "sessions",
    probeErrors
  );
  const sessionsPlain =
    sessionsRich.length > 0
      ? sessionsRich
      : await tryQueryList<{ sessions?: Record<string, unknown>[] }>(
          apiKey,
          "sessions plain",
          QUERIES.sessionsPlain,
          variables,
          "sessions",
          probeErrors
        );

  const apps = await tryQueryList<{ appsAndWebsites?: Record<string, unknown>[] }>(
    apiKey,
    "appsAndWebsites",
    QUERIES.appsAndWebsites,
    variables,
    "appsAndWebsites",
    probeErrors
  );

  const parsed: RizeTimeEntry[] = [];
  for (const raw of timeEntriesRaw) {
    const e = parseGenericTimeEntry(raw, "time", "time");
    if (e) parsed.push(e);
  }
  if (timeEntriesRaw.length) sources.push("timeEntries");

  for (const raw of projectPlain) {
    const e = parseGenericTimeEntry(raw, "project", "project");
    if (e) parsed.push(e);
  }
  if (projectPlain.length) sources.push("projectTimeEntries");

  for (const raw of taskPlain) {
    const e = parseGenericTimeEntry(raw, "task", "task");
    if (e) parsed.push(e);
  }
  if (taskPlain.length) sources.push("taskTimeEntries");

  for (const raw of sessionsPlain) {
    const e = parseSessionEntry(raw);
    if (e) parsed.push(e);
  }
  if (sessionsPlain.length) sources.push("sessions");

  const seen = new Set<string>();
  const merged: RizeTimeEntry[] = [];
  for (const entry of parsed) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    merged.push(entry);
  }

  const gapSummaries = await fillGapSummaries(apiKey, window, merged, probeErrors);
  if (gapSummaries > 0) sources.push("summaries-gap");

  const inWindow = filterEntriesInWindow(merged, window);
  let summaries = gapSummaries;
  let appBlocks = 0;
  let categoryBlocks = 0;
  let topAppMinutes: number | undefined;

  if (inWindow.length === 0 && apps.length > 0) {
    merged.splice(0, merged.length);

    const todayWindow = resolveTodayWindow();
    const todayApps = await fetchAppsList(apiKey, todayWindow, probeErrors);
    const fallback = await appendActivityFallbacks(
      apiKey,
      window,
      merged,
      sources,
      probeErrors,
      todayApps.length > 0 ? todayApps : apps
    );
    summaries += fallback.summaries;
    appBlocks = fallback.appBlocks;
    categoryBlocks = fallback.categoryBlocks;
    topAppMinutes = fallback.topAppMinutes;
  }

  const finalEntries = filterEntriesInWindow(merged, window);

  return {
    entries: finalEntries,
    stats: {
      timeEntries: timeEntriesRaw.length,
      projectEntries: projectPlain.length,
      taskEntries: taskPlain.length,
      sessions: sessionsPlain.length,
      appsTracked: apps.length,
      summaries,
      appBlocks,
      categoryBlocks,
      topAppMinutes,
      totalRaw: finalEntries.length,
      inWindow: finalEntries.length,
      mapped: 0,
      tooShort: 0,
      sources,
      probeErrors,
      userEmail: user.email,
    },
  };
}

export async function syncRizeCalendarEvents(
  apiKey: string,
  window: RizeSyncWindow,
  options?: { generateIfEmpty?: boolean }
): Promise<{ events: RizeCalendarEvent[]; stats: RizeFetchStats }> {
  let { entries, stats } = await fetchRizeTimeEntries(apiKey, window);

  if (entries.length === 0 && options?.generateIfEmpty && stats.appsTracked > 0) {
    const todayWindow = resolveTodayWindow();
    const gen = await generateRizeTimeEntries(apiKey, todayWindow);
    stats = { ...stats, generated: gen.ok, generateError: gen.error };

    if (gen.ok) {
      for (const delay of GENERATE_POLL_MS) {
        await sleep(delay);
        const retry = await fetchRizeTimeEntries(apiKey, window);
        if (retry.entries.length > 0) {
          entries = retry.entries;
          stats = { ...retry.stats, generated: true };
          break;
        }
      }
    }

    if (entries.length === 0) {
      const retry = await fetchRizeTimeEntries(apiKey, window);
      entries = retry.entries;
      stats = { ...retry.stats, generated: gen.ok, generateError: gen.error };
    }
  }

  const mapped: RizeCalendarEvent[] = [];
  let tooShort = 0;
  for (const entry of entries) {
    const ev = mapRizeEntryToCalendarEvent(entry);
    if (ev) mapped.push(ev);
    else tooShort += 1;
  }

  return {
    events: mapped,
    stats: { ...stats, mapped: mapped.length, tooShort },
  };
}

export async function verifyRizeConnection(apiKey: string): Promise<string | null> {
  const user = await fetchCurrentUser(apiKey);
  if (!user.email) {
    throw new Error("Rize API key is set but currentUser is empty — regenerate the key in Rize");
  }
  return user.email;
}
