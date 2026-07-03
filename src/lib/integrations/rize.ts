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
  kind: RizeEntryKind;
  status?: string | null;
}

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
  timeEntriesRich: `
    query TimeEntries($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!) {
      timeEntries(startTime: $startTime, endTime: $endTime) {
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
  `,
  timeEntriesStatuses: `
    query TimeEntries($startTime: ISO8601DateTime!, $endTime: ISO8601DateTime!, $statuses: [String!]) {
      timeEntries(startTime: $startTime, endTime: $endTime, statuses: $statuses) {
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

  const title = typeof raw.title === "string" ? raw.title : null;
  const description =
    (typeof raw.description === "string" ? raw.description : null) ?? title;

  const projectName =
    pickName(project) ?? pickName(task) ?? pickName(taskProject) ?? title;

  const duration =
    typeof raw.duration === "number"
      ? raw.duration
      : typeof raw.duration === "string"
        ? Number.parseFloat(raw.duration)
        : null;

  return {
    id: `${idPrefix}_${String(raw.id)}`,
    description,
    duration: Number.isFinite(duration) ? duration : null,
    startTime,
    endTime,
    source: kind,
    projectName,
    clientName: pickName(client),
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

export function rizeCategoryFromProject(
  projectName: string | null,
  description: string | null
): EventCategory {
  const hay = `${projectName ?? ""} ${description ?? ""}`.toLowerCase();
  if (/cursor|vscode|code|github|terminal|figma|notion|slack|discord|chrome|firefox|edge/.test(hay))
    return "work";
  if (/english|duolingo|language|learn|study|course|math|ml|program|anysa/.test(hay))
    return "learning";
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
  const project = entry.projectName?.trim() || "Unassigned";
  const desc = entry.description?.trim();
  if (entry.kind === "session") {
    if (desc && desc !== project) return `${project} — ${desc}`;
    return `${project} session`;
  }
  if (desc && desc !== project) return `${project} — ${desc}`;
  return project;
}

export function rizeIsoToNaive(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00`;
}

export function entryDurationMs(entry: RizeTimeEntry): number {
  if (entry.duration != null && entry.duration > 0) {
    // Rize may return seconds or milliseconds — infer from magnitude.
    return entry.duration > 10_000 ? entry.duration : entry.duration * 1000;
  }
  const start = new Date(entry.startTime).getTime();
  const end = new Date(entry.endTime).getTime();
  return Math.max(0, end - start);
}

export function mapRizeEntryToCalendarEvent(entry: RizeTimeEntry): RizeCalendarEvent | null {
  const minMs =
    entry.kind === "summary" || entry.source === "apps" || entry.source === "categories"
      ? 30_000
      : MIN_RIZE_ENTRY_MS;
  if (entryDurationMs(entry) < minMs) return null;

  const notes: string[] = [`Rize ${entry.kind}`];
  if (entry.status) notes.push(`Status: ${entry.status}`);
  if (entry.clientName) notes.push(`Client: ${entry.clientName}`);

  return {
    rizeEntryId: entry.id,
    title: buildRizeEventTitle(entry),
    category: rizeCategoryFromProject(entry.projectName, entry.description),
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

  const timePlain = await tryQueryList<{ timeEntries?: Record<string, unknown>[] }>(
    apiKey,
    "timeEntries",
    QUERIES.timeEntriesRich,
    variables,
    "timeEntries",
    probeErrors
  );
  let timeEntriesRaw = timePlain;
  if (timeEntriesRaw.length === 0) {
    timeEntriesRaw = await tryQueryList<{ timeEntries?: Record<string, unknown>[] }>(
      apiKey,
      "timeEntries+statuses",
      QUERIES.timeEntriesStatuses,
      { ...variables, statuses: ["active", "pending", "generating"] },
      "timeEntries",
      probeErrors
    );
  }

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

  const inWindow = filterEntriesInWindow(merged, window);
  let summaries = 0;
  let appBlocks = 0;
  let categoryBlocks = 0;
  let topAppMinutes: number | undefined;

  if (inWindow.length === 0 && apps.length > 0) {
    // Drop out-of-window API rows so app/category fallbacks are not skipped.
    merged.splice(0, merged.length, ...inWindow);

    const todayApps = await fetchAppsList(apiKey, resolveTodayWindow(), probeErrors);
    const fallback = await appendActivityFallbacks(
      apiKey,
      window,
      merged,
      sources,
      probeErrors,
      todayApps.length > 0 ? todayApps : apps
    );
    summaries = fallback.summaries;
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
