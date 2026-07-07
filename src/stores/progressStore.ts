import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LearningTrack, DailyReport, WeeklyReport, DailyLog, TrackType } from "@/types";
import { uid } from "@/lib/utils";
import {
  applyAutoLock,
  isLocked,
  touchTimestamp,
  writePermanentArchive,
} from "@/lib/dataProtection";

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const cloneLogs = (logs: DailyLog[]): DailyLog[] => logs.map((l) => ({ ...l }));

interface ProgressState {
  tracks: LearningTrack[];
  reports: DailyReport[];
  weeklyReports: WeeklyReport[];
  logs: DailyLog[];
  logsPast: DailyLog[][];
  goal: { title: string; targetHours: number };

  addTrack: (name: string, type: TrackType, targetHours?: number) => void;
  removeTrack: (id: string) => void;

  addReport: (r: Omit<DailyReport, "id">) => void;
  addWeeklyReport: (r: Omit<WeeklyReport, "id">) => void;

  addLog: (text: string, calendarEventId?: string, timerSessionId?: string) => string;
  updateLog: (id: string, text: string) => void;
  removeLog: (id: string) => void;
  unlockLog: (id: string) => void;
  undoLogs: () => { logs: DailyLog[]; removeCalendarEventIds: string[] } | null;
  canUndoLogs: () => boolean;
  runProtectionCheck: () => number;
}

const seedTracks: LearningTrack[] = [
  { id: uid("trk"), name: "English", type: "language", targetHours: 80, loggedHours: 0, streak: 0 },
  { id: uid("trk"), name: "Python", type: "programming", targetHours: 120, loggedHours: 0, streak: 0 },
  { id: uid("trk"), name: "ML", type: "ml", targetHours: 200, loggedHours: 0, streak: 0 },
];

const pushLogsHistory = (logs: DailyLog[], logsPast: DailyLog[][]) =>
  [...logsPast, cloneLogs(logs)].slice(-30);

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      tracks: seedTracks,
      reports: [],
      weeklyReports: [],
      logs: [],
      logsPast: [],
      goal: {
        title: "Master Machine Learning and land an offer in 3–4 months",
        targetHours: 200,
      },

      addTrack: (name, type, targetHours) =>
        set((s) => ({
          tracks: [
            ...s.tracks,
            { id: uid("trk"), name, type, targetHours, loggedHours: 0, streak: 0 },
          ],
        })),
      removeTrack: (id) =>
        set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id) })),

      addReport: (r) =>
        set((s) => ({
          reports: [{ ...r, id: uid("rep") }, ...s.reports].slice(0, 30),
        })),

      addWeeklyReport: (r) =>
        set((s) => ({
          weeklyReports: [{ ...r, id: uid("wrep") }, ...s.weeklyReports].slice(0, 12),
        })),

      addLog: (text, calendarEventId, timerSessionId) => {
        const id = uid("log");
        const now = touchTimestamp();
        set((s) => ({
          logsPast: pushLogsHistory(s.logs, s.logsPast),
          logs: [
            {
              id,
              date: todayKey(),
              text: text.trim(),
              createdAt: now,
              calendarEventId,
              timerSessionId,
              lastModifiedAt: now,
              locked: false,
            },
            ...s.logs,
          ].slice(0, 500),
        }));
        return id;
      },

      updateLog: (id, text) =>
        set((s) => {
          const log = s.logs.find((l) => l.id === id);
          if (log && isLocked(log)) return s;
          return {
            logsPast: pushLogsHistory(s.logs, s.logsPast),
            logs: s.logs.map((l) =>
              l.id === id ? { ...l, text: text.trim(), lastModifiedAt: touchTimestamp() } : l
            ),
          };
        }),

      removeLog: (id) =>
        set((s) => {
          const log = s.logs.find((l) => l.id === id);
          if (log && isLocked(log)) return s;
          return {
            logsPast: pushLogsHistory(s.logs, s.logsPast),
            logs: s.logs.filter((l) => l.id !== id),
          };
        }),

      unlockLog: (id) =>
        set((s) => ({
          logs: s.logs.map((l) =>
            l.id === id
              ? { ...l, locked: false, lockedAt: undefined, lastModifiedAt: touchTimestamp() }
              : l
          ),
        })),

      undoLogs: () => {
        const s = get();
        if (!s.logsPast.length) return null;
        const prev = s.logsPast[s.logsPast.length - 1];
        const prevIds = new Set(prev.map((l) => l.id));
        const removeCalendarEventIds = s.logs
          .filter((l) => !prevIds.has(l.id) && l.calendarEventId)
          .map((l) => l.calendarEventId!);
        set({ logs: cloneLogs(prev), logsPast: s.logsPast.slice(0, -1) });
        return { logs: cloneLogs(prev), removeCalendarEventIds };
      },

      canUndoLogs: () => get().logsPast.length > 0,

      runProtectionCheck: () => {
        const s = get();
        const result = applyAutoLock(s.logs, (l) => l.createdAt);
        if (result.newlyLocked.length > 0) {
          writePermanentArchive({ dailyLogs: result.newlyLocked });
        }
        if (result.items !== s.logs) {
          set({ logs: result.items });
        }
        return result.newlyLocked.length;
      },
    }),
    {
      name: "mdp-progress",
      version: 2,
      migrate: (persisted) => {
        const s = persisted as Record<string, unknown>;
        return { ...s, weeklyReports: s.weeklyReports ?? [] };
      },
      partialize: (s) => ({
        tracks: s.tracks,
        reports: s.reports,
        weeklyReports: s.weeklyReports,
        logs: s.logs,
        goal: s.goal,
      }),
    }
  )
);
