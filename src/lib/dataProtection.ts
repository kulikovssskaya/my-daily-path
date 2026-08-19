/** Auto-lock records unchanged for 2+ days and archive them permanently. */

export const LOCK_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
export const PERMANENT_ARCHIVE_KEY = "mdp-permanent-archive";

export interface LockableFields {
  /** ISO timestamp of last user/system edit. */
  lastModifiedAt?: string;
  /** When true, AI/planner/bulk ops cannot change or delete this record. */
  locked?: boolean;
  lockedAt?: string;
}

export function touchTimestamp(): string {
  return new Date().toISOString();
}

export function isLocked(record: LockableFields): boolean {
  return Boolean(record.locked);
}

export function staleSince(lastModifiedAt: string | undefined, nowMs = Date.now()): boolean {
  if (!lastModifiedAt) return false;
  const t = new Date(lastModifiedAt).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t >= LOCK_AFTER_MS;
}

export function effectiveModifiedAt(
  record: LockableFields,
  fallbackIso: string
): string {
  return record.lastModifiedAt ?? fallbackIso;
}

export interface PermanentArchive {
  version: 1;
  updatedAt: string;
  scheduleEvents: unknown[];
  habits: unknown[];
  dailyLogs: unknown[];
}

export function readPermanentArchive(): PermanentArchive {
  if (typeof window === "undefined") {
    return { version: 1, updatedAt: "", scheduleEvents: [], habits: [], dailyLogs: [] };
  }
  try {
    const raw = localStorage.getItem(PERMANENT_ARCHIVE_KEY);
    if (!raw) {
      return { version: 1, updatedAt: "", scheduleEvents: [], habits: [], dailyLogs: [] };
    }
    const parsed = JSON.parse(raw) as PermanentArchive;
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? "",
      scheduleEvents: parsed.scheduleEvents ?? [],
      habits: parsed.habits ?? [],
      dailyLogs: parsed.dailyLogs ?? [],
    };
  } catch {
    return { version: 1, updatedAt: "", scheduleEvents: [], habits: [], dailyLogs: [] };
  }
}

export function removeHabitsFromPermanentArchive(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;
  const prev = readPermanentArchive();
  const drop = new Set(ids);
  const habits = prev.habits.filter((h) => !drop.has((h as { id?: string }).id ?? ""));
  if (habits.length === prev.habits.length) return;
  try {
    localStorage.setItem(
      PERMANENT_ARCHIVE_KEY,
      JSON.stringify({ ...prev, habits, updatedAt: touchTimestamp() })
    );
  } catch {
    /* best-effort */
  }
}

export function writePermanentArchive(patch: {
  scheduleEvents?: unknown[];
  habits?: unknown[];
  dailyLogs?: unknown[];
}) {
  if (typeof window === "undefined") return;
  const prev = readPermanentArchive();
  const mergeUnique = (existing: unknown[], incoming: unknown[], idKey = "id") => {
    const map = new Map<string, unknown>();
    for (const item of existing) {
      const id = (item as Record<string, string>)?.[idKey];
      if (id) map.set(id, item);
    }
    for (const item of incoming) {
      const id = (item as Record<string, string>)?.[idKey];
      if (id) map.set(id, item);
    }
    return [...map.values()];
  };

  const next: PermanentArchive = {
    version: 1,
    updatedAt: touchTimestamp(),
    scheduleEvents: mergeUnique(prev.scheduleEvents, patch.scheduleEvents ?? []),
    habits: mergeUnique(prev.habits, patch.habits ?? []),
    dailyLogs: mergeUnique(prev.dailyLogs, patch.dailyLogs ?? []),
  };
  try {
    localStorage.setItem(PERMANENT_ARCHIVE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or private mode — archive is best-effort
  }
}

export function applyAutoLock<T extends LockableFields>(
  items: T[],
  fallbackIso: (item: T) => string
): { items: T[]; newlyLocked: T[] } {
  const now = touchTimestamp();
  const newlyLocked: T[] = [];
  const itemsOut = items.map((item) => {
    if (item.locked) return item;
    const lm = effectiveModifiedAt(item, fallbackIso(item));
    const withLm = item.lastModifiedAt ? item : { ...item, lastModifiedAt: lm };
    if (!staleSince(lm)) return withLm;
    const locked = { ...withLm, locked: true, lockedAt: now };
    newlyLocked.push(locked);
    return locked;
  });
  return { items: itemsOut, newlyLocked };
}
