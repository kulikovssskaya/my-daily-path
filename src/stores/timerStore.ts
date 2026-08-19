import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EventCategory, TimerSession } from "@/types";
import { uid, toNaiveISO } from "@/lib/utils";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";

/** Keep only a running session when restoring from localStorage. */
export function sanitizeActiveTimer(session: TimerSession | null | undefined): TimerSession | null {
  if (!session || session.endedAt != null) return null;
  if (!Number.isFinite(session.startedAt) || session.startedAt <= 0) return null;
  return session;
}

const MIN_SAVE_MS = 60_000;

interface TimerDraft {
  title: string;
  category: EventCategory;
  trackId: string;
  saveToCalendar: boolean;
}

interface TimerState {
  active: TimerSession | null;
  draft: TimerDraft;
  history: TimerSession[];
  setDraft: (patch: Partial<TimerDraft>) => void;
  start: () => void;
  stop: () => TimerSession | null;
  discard: () => void;
}

const defaultDraft: TimerDraft = {
  title: "",
  category: "learning",
  trackId: "",
  saveToCalendar: true,
};

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      active: null,
      draft: defaultDraft,
      history: [],

      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

      start: () => {
        const { draft } = get();
        const title = draft.title.trim() || "Focus session";
        const track = useProgressStore
          .getState()
          .tracks.find((t) => t.id === draft.trackId);
        const session: TimerSession = {
          id: uid("timer"),
          title,
          category: draft.category,
          track: track?.name.toLowerCase() ?? "",
          kind: "stopwatch",
          startedAt: Date.now(),
          endedAt: null,
          savedToCalendar: false,
        };
        set({ active: session });
      },

      stop: () => {
        const { active, draft } = get();
        if (!active) return null;

        const endedAt = Date.now();
        const durationMs = endedAt - active.startedAt;
        let calendarEventId: string | undefined;
        let logId: string | undefined;

        if (draft.saveToCalendar && durationMs >= MIN_SAVE_MS) {
          const trackMeta =
            active.category === "learning" && active.track
              ? { track: active.track }
              : undefined;
          calendarEventId = useScheduleStore.getState().addEvent({
            title: active.title,
            category: active.category,
            start: toNaiveISO(new Date(active.startedAt)),
            end: toNaiveISO(new Date(endedAt)),
            status: "done",
            priority: 3,
            meta: trackMeta,
          });
          logId = useProgressStore
            .getState()
            .addLog(`Timer: ${active.title}`, {
              calendarEventId,
              timerSessionId: active.id,
            });
        }

        const session: TimerSession = {
          ...active,
          endedAt,
          savedToCalendar: Boolean(calendarEventId),
          calendarEventId,
          logId,
        };

        set((s) => ({
          active: null,
          history: [session, ...s.history].slice(0, 50),
        }));

        return session;
      },

      discard: () => set({ active: null }),
    }),
    {
      name: "mdp-timer",
      partialize: (s) => ({ draft: s.draft, history: s.history, active: s.active }),
      onRehydrateStorage: () => (state) => {
        if (state) state.active = sanitizeActiveTimer(state.active);
      },
    }
  )
);

export function formatTimerElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
