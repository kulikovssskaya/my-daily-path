import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ScheduleEvent,
  Habit,
  EventStatus,
  EventCategory,
} from "@/types";
import type { AIEvent, AIHabit } from "@/lib/ai/schemas";
import type { RizeCalendarEvent } from "@/lib/integrations/rize";
import { uid } from "@/lib/utils";
import { eventDayKey, todayKeyFromIso } from "@/lib/planSafety";
import {
  applyAutoLock,
  isLocked,
  touchTimestamp,
  writePermanentArchive,
} from "@/lib/dataProtection";

interface Snapshot {
  events: ScheduleEvent[];
  habits: Habit[];
}

interface ScheduleState {
  events: ScheduleEvent[];
  habits: Habit[];
  /** Undo history (not persisted). */
  past: Snapshot[];

  addEvent: (
    e: Omit<ScheduleEvent, "id" | "status"> & { status?: EventStatus }
  ) => string;
  updateEvent: (id: string, patch: Partial<ScheduleEvent>) => void;
  removeEvent: (id: string) => void;
  cycleStatus: (id: string) => void;
  unlockEvent: (id: string) => void;

  addHabit: (h: Omit<Habit, "id">) => void;
  addHabits: (habits: AIHabit[]) => number;
  setHabits: (habits: AIHabit[]) => number;
  removeHabit: (id: string) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;

  applyPlan: (aiEvents: AIEvent[], nowIso?: string) => { applied: number; droppedPast: number };
  mergeRizeEvents: (entries: RizeCalendarEvent[]) => {
    added: number;
    updated: number;
    skipped: number;
  };
  undo: () => void;
  runProtectionCheck: () => number;
}

const nextStatus: Record<EventStatus, EventStatus> = {
  planned: "done",
  done: "skipped",
  skipped: "planned",
};

const seedHabits: Habit[] = [
  {
    id: uid("habit"),
    title: "Massage",
    weekdays: [2, 4],
    time: "18:00",
    duration: 60,
    category: "health",
    lastModifiedAt: touchTimestamp(),
  },
];

const snap = (s: Snapshot): Snapshot => ({ events: s.events, habits: s.habits });
const pushHistory = (s: ScheduleState) => [...s.past, snap(s)].slice(-30);

function habitFromAI(h: AIHabit): Habit {
  return {
    id: uid("habit"),
    title: h.title,
    weekdays: h.weekdays,
    time: h.time,
    duration: h.duration,
    category: h.category as EventCategory,
    lastModifiedAt: touchTimestamp(),
  };
}

function stampEvent(
  e: Omit<ScheduleEvent, "id" | "status"> & { status?: EventStatus },
  id: string
): ScheduleEvent {
  const now = touchTimestamp();
  return {
    ...e,
    id,
    status: e.status ?? "planned",
    lastModifiedAt: now,
    locked: false,
  };
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      events: [],
      habits: seedHabits,
      past: [],

      addEvent: (e) => {
        const id = uid("ev");
        set((s) => ({
          past: pushHistory(s),
          events: [...s.events, stampEvent(e, id)],
        }));
        return id;
      },

      updateEvent: (id, patch) =>
        set((s) => {
          const ev = s.events.find((x) => x.id === id);
          if (!ev) return s;
          if (isLocked(ev) && patch.locked !== false) return s;
          const next = { ...ev, ...patch, lastModifiedAt: touchTimestamp() };
          if (patch.locked === false) {
            next.locked = false;
            next.lockedAt = undefined;
          }
          return {
            past: pushHistory(s),
            events: s.events.map((x) => (x.id === id ? next : x)),
          };
        }),

      removeEvent: (id) =>
        set((s) => {
          const ev = s.events.find((x) => x.id === id);
          if (ev && isLocked(ev)) return s;
          return {
            past: pushHistory(s),
            events: s.events.filter((x) => x.id !== id),
          };
        }),

      cycleStatus: (id) =>
        set((s) => ({
          past: pushHistory(s),
          events: s.events.map((ev) =>
            ev.id === id
              ? { ...ev, status: nextStatus[ev.status], lastModifiedAt: touchTimestamp() }
              : ev
          ),
        })),

      unlockEvent: (id) =>
        set((s) => ({
          past: pushHistory(s),
          events: s.events.map((ev) =>
            ev.id === id
              ? { ...ev, locked: false, lockedAt: undefined, lastModifiedAt: touchTimestamp() }
              : ev
          ),
        })),

      addHabit: (h) =>
        set((s) => ({
          past: pushHistory(s),
          habits: [
            ...s.habits,
            { ...h, id: uid("habit"), lastModifiedAt: touchTimestamp(), locked: false },
          ],
        })),

      addHabits: (aiHabits) => {
        const valid = aiHabits.filter((h) => h.title.trim() && h.weekdays.length > 0);
        set((s) => ({
          past: pushHistory(s),
          habits: [...s.habits, ...valid.map(habitFromAI)],
        }));
        return valid.length;
      },

      setHabits: (aiHabits) => {
        const valid = aiHabits.filter((h) => h.title.trim() && h.weekdays.length > 0);
        set((s) => {
          const locked = s.habits.filter(isLocked);
          const fresh = valid.map(habitFromAI);
          const merged = [
            ...locked,
            ...fresh.filter((f) => !locked.some((l) => l.id === f.id)),
          ];
          return { past: pushHistory(s), habits: merged };
        });
        return valid.length;
      },

      removeHabit: (id) =>
        set((s) => {
          const h = s.habits.find((x) => x.id === id);
          if (h && isLocked(h)) return s;
          return {
            past: pushHistory(s),
            habits: s.habits.filter((x) => x.id !== id),
          };
        }),

      updateHabit: (id, patch) =>
        set((s) => {
          const h = s.habits.find((x) => x.id === id);
          if (!h) return s;
          if (isLocked(h) && patch.locked !== false) return s;
          const next = { ...h, ...patch, lastModifiedAt: touchTimestamp() };
          if (patch.locked === false) {
            next.locked = false;
            next.lockedAt = undefined;
          }
          return {
            past: pushHistory(s),
            habits: s.habits.map((x) => (x.id === id ? next : x)),
          };
        }),

      applyPlan: (aiEvents, nowIso) => {
        const today = todayKeyFromIso(nowIso ?? new Date().toISOString());
        const safe = aiEvents.filter((e) => eventDayKey(e.start) >= today);
        const droppedPast = aiEvents.length - safe.length;

        if (safe.length === 0) {
          return { applied: 0, droppedPast };
        }

        let applied = 0;
        set((s) => {
          const affectedDays = new Set(safe.map((e) => eventDayKey(e.start)));
          const preserved = s.events.filter((ev) => {
            const dk = eventDayKey(ev.start);
            if (dk < today) return true;
            if (isLocked(ev)) return true;
            if (affectedDays.has(dk) && ev.status === "planned") return false;
            return true;
          });
          const now = touchTimestamp();
          const fresh: ScheduleEvent[] = safe.map((e) => ({
            id: uid("ev"),
            title: e.title,
            category: e.category as EventCategory,
            start: e.start,
            end: e.end,
            status: "planned",
            priority: (e.priority as 1 | 2 | 3) ?? 2,
            energy: e.energy,
            notes: e.notes,
            meta: e.track ? { track: e.track } : undefined,
            lastModifiedAt: now,
            locked: false,
          }));
          applied = fresh.length;
          return { past: pushHistory(s), events: [...preserved, ...fresh] };
        });

        return { applied, droppedPast };
      },

      mergeRizeEvents: (entries) => {
        let added = 0;
        let updated = 0;
        let skipped = 0;

        set((s) => {
          const events = [...s.events];
          let changed = false;

          for (const entry of entries) {
            const idx = events.findIndex((ev) => ev.meta?.rizeEntryId === entry.rizeEntryId);
            const payload = {
              title: entry.title,
              category: entry.category,
              start: entry.start,
              end: entry.end,
              status: "done" as const,
              priority: 3 as const,
              meta: {
                ...(entry.track ? { track: entry.track } : {}),
                rizeEntryId: entry.rizeEntryId,
              },
              notes: entry.notes,
              lastModifiedAt: touchTimestamp(),
            };

            if (idx >= 0) {
              const existing = events[idx];
              if (isLocked(existing)) {
                skipped += 1;
                continue;
              }
              events[idx] = { ...existing, ...payload };
              updated += 1;
              changed = true;
            } else {
              events.push(
                stampEvent(
                  {
                    ...payload,
                    status: "done",
                  },
                  uid("ev")
                )
              );
              added += 1;
              changed = true;
            }
          }

          if (!changed) return s;
          return { past: pushHistory(s), events };
        });

        return { added, updated, skipped };
      },

      undo: () =>
        set((s) => {
          if (s.past.length === 0) return s;
          const prev = s.past[s.past.length - 1];
          return {
            events: prev.events,
            habits: prev.habits,
            past: s.past.slice(0, -1),
          };
        }),

      runProtectionCheck: () => {
        const s = get();
        const evResult = applyAutoLock(s.events, (ev) => ev.start);
        const habResult = applyAutoLock(s.habits, (h) => h.lastModifiedAt ?? touchTimestamp());
        const newlyLocked = evResult.newlyLocked.length + habResult.newlyLocked.length;

        if (newlyLocked > 0) {
          writePermanentArchive({
            scheduleEvents: evResult.newlyLocked,
            habits: habResult.newlyLocked,
          });
        }

        if (
          evResult.items !== s.events ||
          habResult.items !== s.habits
        ) {
          set({ events: evResult.items, habits: habResult.items });
        }

        return newlyLocked;
      },
    }),
    {
      name: "mdp-schedule",
      partialize: (s) => ({ events: s.events, habits: s.habits }),
    }
  )
);
