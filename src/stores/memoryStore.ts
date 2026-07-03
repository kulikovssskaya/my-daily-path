import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserMemory, Pace, MemoryNote } from "@/types";
import { uid } from "@/lib/utils";

interface MemoryState extends UserMemory {
  setPace: (topic: string, pace: Pace) => void;
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

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      ...initialMemory,

      setPace: (topic, pace) =>
        set((s) => ({ learningPace: { ...s.learningPace, [topic]: pace } })),
      addNote: (text) =>
        set((s) => ({
          notes: [
            ...s.notes,
            { id: uid("note"), text, createdAt: new Date().toISOString() } as MemoryNote,
          ],
        })),
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
