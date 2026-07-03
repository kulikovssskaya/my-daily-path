import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EventCategory, TimerSession } from "@/types";
import { uid } from "@/lib/utils";
import { MIN_TIMER_SESSION_MS } from "@/lib/timerSessions";

export type TimerKind = "stopwatch" | "pomodoro";
export type PomodoroPhase = "focus" | "short_break" | "long_break";

interface TimerSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  roundsBeforeLong: number;
}

interface TimerState {
  kind: TimerKind;
  stopwatchAccumulatedMs: number;
  stopwatchRunning: boolean;
  stopwatchStartedAt: number | null;

  pomodoroPhase: PomodoroPhase;
  pomodoroRunning: boolean;
  pomodoroPhaseEndAt: number | null;
  pomodoroRemainingMs: number;
  pomodoroRound: number;

  activityTitle: string;
  activityCategory: EventCategory;
  activityTrack: string;
  autoDetect: boolean;
  sessionStartedAt: number | null;

  sessions: TimerSession[];
  activeSessionId: string | null;

  settings: TimerSettings;
  notificationsOn: boolean;
  soundOn: boolean;

  setKind: (k: TimerKind) => void;
  setActivity: (title: string, category: EventCategory, track?: string) => void;
  setAutoDetect: (v: boolean) => void;
  applyDetected: (title: string, category: EventCategory, track?: string) => void;
  updateSettings: (patch: Partial<TimerSettings>) => void;
  setNotificationsOn: (v: boolean) => void;
  setSoundOn: (v: boolean) => void;

  startStopwatch: () => void;
  pauseStopwatch: () => void;
  resetStopwatch: () => void;
  getStopwatchElapsedMs: () => number;

  startPomodoro: () => void;
  pausePomodoro: () => void;
  resetPomodoro: () => void;
  getPomodoroRemainingMs: () => number;
  checkPomodoroComplete: () => boolean;
  advancePomodoroPhase: () => PomodoroPhase;

  updateSession: (id: string, patch: Partial<TimerSession>) => void;
  removeSession: (id: string) => void;
  markSessionSaved: (id: string, calendarEventId: string, logId: string) => void;
  stopActiveSessionNow: () => void;
}

const defaultSettings: TimerSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  roundsBeforeLong: 4,
};

function newSession(s: TimerState): TimerSession {
  return {
    id: uid("tsess"),
    title: s.activityTitle,
    category: s.activityCategory,
    track: s.activityTrack,
    kind: s.kind,
    startedAt: Date.now(),
    endedAt: null,
    savedToCalendar: false,
  };
}

function syncActiveSessionMeta(set: (fn: (state: TimerState) => Partial<TimerState>) => void) {
  set((state) => {
    if (!state.activeSessionId) return {};
    return {
      sessions: state.sessions.map((sess) =>
        sess.id === state.activeSessionId
          ? {
              ...sess,
              title: state.activityTitle,
              category: state.activityCategory,
              track: state.activityTrack,
              kind: state.kind,
            }
          : sess
      ),
    };
  });
}

function ensureActiveSession(
  set: (partial: Partial<TimerState> | ((s: TimerState) => Partial<TimerState>)) => void,
  get: () => TimerState
) {
  const s = get();
  if (s.activeSessionId) {
    syncActiveSessionMeta(set as (fn: (state: TimerState) => Partial<TimerState>) => void);
    return;
  }
  const session = newSession(s);
  set({
    activeSessionId: session.id,
    sessions: [session, ...s.sessions].slice(0, 80),
  });
}

function finalizeActiveSession(
  set: (partial: Partial<TimerState> | ((s: TimerState) => Partial<TimerState>)) => void,
  get: () => TimerState,
  endedAt: number,
  minMs: number
) {
  const s = get();
  if (!s.activeSessionId) return;
  const active = s.sessions.find((x) => x.id === s.activeSessionId);
  const duration = active ? endedAt - active.startedAt : 0;

  if (duration >= minMs) {
    set({
      activeSessionId: null,
      sessions: s.sessions.map((sess) =>
        sess.id === s.activeSessionId ? { ...sess, endedAt } : sess
      ),
    });
  } else {
    set({
      activeSessionId: null,
      sessions: s.sessions.filter((sess) => sess.id !== s.activeSessionId),
    });
  }
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      kind: "stopwatch",
      stopwatchAccumulatedMs: 0,
      stopwatchRunning: false,
      stopwatchStartedAt: null,

      pomodoroPhase: "focus",
      pomodoroRunning: false,
      pomodoroPhaseEndAt: null,
      pomodoroRemainingMs: defaultSettings.focusMin * 60_000,
      pomodoroRound: 1,

      activityTitle: "",
      activityCategory: "learning",
      activityTrack: "",
      autoDetect: true,
      sessionStartedAt: null,

      sessions: [],
      activeSessionId: null,

      settings: defaultSettings,
      notificationsOn: true,
      soundOn: true,

      setKind: (k) => set({ kind: k }),
      setActivity: (title, category, track) => {
        set({
          activityTitle: title,
          activityCategory: category,
          activityTrack: track ?? "",
          autoDetect: false,
        });
        syncActiveSessionMeta(set);
      },
      setAutoDetect: (v) => set({ autoDetect: v }),
      applyDetected: (title, category, track) => {
        if (!get().autoDetect) return;
        set({ activityTitle: title, activityCategory: category, activityTrack: track ?? "" });
        syncActiveSessionMeta(set);
      },
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      setNotificationsOn: (v) => set({ notificationsOn: v }),
      setSoundOn: (v) => set({ soundOn: v }),

      startStopwatch: () => {
        ensureActiveSession(set, get);
        set((s) => ({
          stopwatchRunning: true,
          stopwatchStartedAt: Date.now(),
          sessionStartedAt: s.sessionStartedAt ?? Date.now(),
        }));
      },

      pauseStopwatch: () =>
        set((s) => {
          if (!s.stopwatchRunning || !s.stopwatchStartedAt) return s;
          const segment = Date.now() - s.stopwatchStartedAt;
          return {
            stopwatchRunning: false,
            stopwatchStartedAt: null,
            stopwatchAccumulatedMs: s.stopwatchAccumulatedMs + segment,
          };
        }),

      resetStopwatch: () => {
        finalizeActiveSession(set, get, Date.now(), MIN_TIMER_SESSION_MS);
        set({
          stopwatchAccumulatedMs: 0,
          stopwatchRunning: false,
          stopwatchStartedAt: null,
          sessionStartedAt: null,
        });
      },

      getStopwatchElapsedMs: () => {
        const s = get();
        const live =
          s.stopwatchRunning && s.stopwatchStartedAt
            ? Date.now() - s.stopwatchStartedAt
            : 0;
        return s.stopwatchAccumulatedMs + live;
      },

      startPomodoro: () => {
        ensureActiveSession(set, get);
        const s = get();
        const ms =
          s.pomodoroPhase === "focus"
            ? s.settings.focusMin * 60_000
            : s.pomodoroPhase === "short_break"
              ? s.settings.shortBreakMin * 60_000
              : s.settings.longBreakMin * 60_000;
        const remaining = s.pomodoroRemainingMs > 0 ? s.pomodoroRemainingMs : ms;
        set({
          pomodoroRunning: true,
          pomodoroPhaseEndAt: Date.now() + remaining,
          sessionStartedAt: s.sessionStartedAt ?? Date.now(),
        });
      },

      pausePomodoro: () =>
        set((s) => {
          if (!s.pomodoroRunning || !s.pomodoroPhaseEndAt) return s;
          const remaining = Math.max(0, s.pomodoroPhaseEndAt - Date.now());
          return {
            pomodoroRunning: false,
            pomodoroPhaseEndAt: null,
            pomodoroRemainingMs: remaining,
          };
        }),

      resetPomodoro: () => {
        finalizeActiveSession(set, get, Date.now(), MIN_TIMER_SESSION_MS);
        set({
          pomodoroPhase: "focus",
          pomodoroRunning: false,
          pomodoroPhaseEndAt: null,
          pomodoroRemainingMs: get().settings.focusMin * 60_000,
          pomodoroRound: 1,
          sessionStartedAt: null,
        });
      },

      getPomodoroRemainingMs: () => {
        const s = get();
        if (s.pomodoroRunning && s.pomodoroPhaseEndAt) {
          return Math.max(0, s.pomodoroPhaseEndAt - Date.now());
        }
        return s.pomodoroRemainingMs;
      },

      checkPomodoroComplete: () => {
        const s = get();
        if (!s.pomodoroRunning || !s.pomodoroPhaseEndAt) return false;
        if (Date.now() >= s.pomodoroPhaseEndAt) {
          set({ pomodoroRunning: false, pomodoroPhaseEndAt: null, pomodoroRemainingMs: 0 });
          return true;
        }
        return false;
      },

      advancePomodoroPhase: () => {
        const s = get();
        if (s.pomodoroPhase === "focus") {
          const nextRound = s.pomodoroRound + 1;
          const isLong = s.pomodoroRound >= s.settings.roundsBeforeLong;
          const nextPhase: PomodoroPhase = isLong ? "long_break" : "short_break";
          const ms = isLong
            ? s.settings.longBreakMin * 60_000
            : s.settings.shortBreakMin * 60_000;
          set({
            pomodoroPhase: nextPhase,
            pomodoroRound: isLong ? 1 : nextRound,
            pomodoroRemainingMs: ms,
          });
          return nextPhase;
        }
        set({
          pomodoroPhase: "focus",
          pomodoroRemainingMs: s.settings.focusMin * 60_000,
        });
        return "focus";
      },

      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...patch } : sess)),
        })),

      removeSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        })),

      markSessionSaved: (id, calendarEventId, logId) =>
        set((s) => ({
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
          sessions: s.sessions.map((sess) =>
            sess.id === id
              ? { ...sess, savedToCalendar: true, calendarEventId, logId }
              : sess
          ),
        })),

      stopActiveSessionNow: () => {
        finalizeActiveSession(set, get, Date.now(), MIN_TIMER_SESSION_MS);
        set({
          stopwatchAccumulatedMs: 0,
          stopwatchRunning: false,
          stopwatchStartedAt: null,
          pomodoroRunning: false,
          pomodoroPhaseEndAt: null,
          sessionStartedAt: null,
        });
      },
    }),
    {
      name: "mdp-timer",
      partialize: (s) => ({
        kind: s.kind,
        settings: s.settings,
        notificationsOn: s.notificationsOn,
        soundOn: s.soundOn,
        autoDetect: s.autoDetect,
        activityTitle: s.activityTitle,
        activityCategory: s.activityCategory,
        activityTrack: s.activityTrack,
        sessions: s.sessions,
        activeSessionId: s.activeSessionId,
      }),
    }
  )
);

export function formatTimerMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
