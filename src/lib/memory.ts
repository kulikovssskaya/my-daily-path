import type { UserMemory } from "@/types";

/** Coerce an arbitrary (client-sent) memory object into a complete UserMemory. */
export function normalizeMemory(raw: unknown): UserMemory {
  const m = (raw ?? {}) as Partial<UserMemory>;
  return {
    goals: Array.isArray(m.goals) ? m.goals : [],
    values: Array.isArray(m.values) ? m.values : [],
    constraints: Array.isArray(m.constraints) ? m.constraints : [],
    learningPace:
      m.learningPace && typeof m.learningPace === "object" ? m.learningPace : {},
    preferences: Array.isArray(m.preferences) ? m.preferences : [],
    notes: Array.isArray(m.notes) ? m.notes : [],
  };
}
