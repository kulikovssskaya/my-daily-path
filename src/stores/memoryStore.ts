import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserMemory, Pace, MemoryNote } from "@/types";
import { uid } from "@/lib/utils";

interface MemoryState extends UserMemory {
  setGoals: (goals: string[]) => void;
  addGoal: (text: string) => void;
  updateGoal: (index: number, text: string) => void;
  removeGoal: (index: number) => void;
  setValues: (values: string[]) => void;
  addValue: (text: string) => void;
  updateValue: (index: number, text: string) => void;
  removeValue: (index: number) => void;
  setConstraints: (constraints: string[]) => void;
  addConstraint: (text: string) => void;
  updateConstraint: (index: number, text: string) => void;
  removeConstraint: (index: number) => void;
  setPreferences: (preferences: string[]) => void;
  addPreference: (text: string) => void;
  updatePreference: (index: number, text: string) => void;
  removePreference: (index: number) => void;
  setPace: (topic: string, pace: Pace) => void;
  removePace: (topic: string) => void;
  addNote: (text: string) => void;
  removeNote: (id: string) => void;
  /** Merge inferred facts from the AI into memory notes. */
  mergeMemoryUpdates: (updates: string[]) => void;
  snapshot: () => UserMemory;
}

const initialMemory: UserMemory = {
  goals: ["Master Machine Learning and land an offer in 3–4 months"],
  values: [],
  constraints: [],
  learningPace: {},
  preferences: [],
  notes: [],
};

function trimNonEmpty(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

function updateStringList(
  list: string[],
  index: number,
  text: string
): string[] {
  const next = [...list];
  next[index] = text.trim();
  return trimNonEmpty(next);
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      ...initialMemory,

      setGoals: (goals) => set({ goals: trimNonEmpty(goals) }),
      addGoal: (text) => {
        const t = text.trim();
        if (!t) return;
        set((s) => ({ goals: [...s.goals, t] }));
      },
      updateGoal: (index, text) =>
        set((s) => ({ goals: updateStringList(s.goals, index, text) })),
      removeGoal: (index) =>
        set((s) => ({ goals: s.goals.filter((_, i) => i !== index) })),

      setValues: (values) => set({ values: trimNonEmpty(values) }),
      addValue: (text) => {
        const t = text.trim();
        if (!t) return;
        set((s) => ({ values: [...s.values, t] }));
      },
      updateValue: (index, text) =>
        set((s) => ({ values: updateStringList(s.values, index, text) })),
      removeValue: (index) =>
        set((s) => ({ values: s.values.filter((_, i) => i !== index) })),

      setConstraints: (constraints) => set({ constraints: trimNonEmpty(constraints) }),
      addConstraint: (text) => {
        const t = text.trim();
        if (!t) return;
        set((s) => ({ constraints: [...s.constraints, t] }));
      },
      updateConstraint: (index, text) =>
        set((s) => ({ constraints: updateStringList(s.constraints, index, text) })),
      removeConstraint: (index) =>
        set((s) => ({ constraints: s.constraints.filter((_, i) => i !== index) })),

      setPreferences: (preferences) => set({ preferences: trimNonEmpty(preferences) }),
      addPreference: (text) => {
        const t = text.trim();
        if (!t) return;
        set((s) => ({ preferences: [...s.preferences, t] }));
      },
      updatePreference: (index, text) =>
        set((s) => ({ preferences: updateStringList(s.preferences, index, text) })),
      removePreference: (index) =>
        set((s) => ({ preferences: s.preferences.filter((_, i) => i !== index) })),

      setPace: (topic, pace) => {
        const key = topic.trim();
        if (!key) return;
        set((s) => ({ learningPace: { ...s.learningPace, [key]: pace } }));
      },
      removePace: (topic) =>
        set((s) => {
          const learningPace = { ...s.learningPace };
          delete learningPace[topic];
          return { learningPace };
        }),

      addNote: (text) => {
        const t = text.trim();
        if (!t) return;
        set((s) => ({
          notes: [
            ...s.notes,
            { id: uid("note"), text: t, createdAt: new Date().toISOString() } as MemoryNote,
          ],
        }));
      },
      removeNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      mergeMemoryUpdates: (updates) =>
        set((s) => ({
          notes: [
            ...s.notes,
            ...updates
              .filter((u) => u.trim())
              .map((u) => ({
                id: uid("note"),
                text: u.trim(),
                createdAt: new Date().toISOString(),
              })),
          ],
        })),

      snapshot: () => {
        const { goals, values, constraints, learningPace, preferences, notes } = get();
        return { goals, values, constraints, learningPace, preferences, notes };
      },
    }),
    { name: "mdp-memory" }
  )
);
