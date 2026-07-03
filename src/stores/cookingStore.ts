import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FridgeItem, Recipe } from "@/types";
import type { AIRecipe } from "@/lib/ai/schemas";
import { uid } from "@/lib/utils";
import { expandRemoveTerms, fridgeItemMatchesRemove } from "@/lib/fridgeMatch";

interface CookingState {
  fridge: FridgeItem[];
  recipes: Recipe[]; // saved favorites + history

  addItem: (name: string, qty?: string) => void;
  updateItem: (id: string, patch: Partial<FridgeItem>) => void;
  removeItem: (id: string) => void;
  /** Apply an AI command: add some items, remove others by (fuzzy) name. Returns counts. */
  applyFridgeCommand: (
    add: { name: string; qty?: string }[],
    remove: string[]
  ) => { added: number; removed: number };

  saveRecipe: (r: AIRecipe, favorite?: boolean) => void;
  toggleFavorite: (id: string) => void;
  removeRecipe: (id: string) => void;
}

export const useCookingStore = create<CookingState>()(
  persist(
    (set) => ({
      fridge: [],
      recipes: [],

      addItem: (name, qty) =>
        set((s) => ({
          fridge: [
            ...s.fridge,
            { id: uid("food"), name, qty, addedAt: new Date().toISOString() },
          ],
        })),
      updateItem: (id, patch) =>
        set((s) => ({
          fridge: s.fridge.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      removeItem: (id) =>
        set((s) => ({ fridge: s.fridge.filter((f) => f.id !== id) })),

      applyFridgeCommand: (add, remove) => {
        let removed = 0;
        set((s) => {
          const fridgeNames = s.fridge.map((f) => f.name);
          const removeTerms = expandRemoveTerms(remove, fridgeNames);
          const kept = s.fridge.filter((f) => {
            const hit = removeTerms.some((t) => fridgeItemMatchesRemove(f.name, t));
            if (hit) removed += 1;
            return !hit;
          });
          const added = add
            .filter((i) => i.name.trim())
            .map((i) => ({
              id: uid("food"),
              name: i.name.trim(),
              qty: i.qty,
              addedAt: new Date().toISOString(),
            }));
          return { fridge: [...kept, ...added] };
        });
        const added = add.filter((i) => i.name.trim()).length;
        return { added, removed };
      },

      saveRecipe: (r, favorite = false) =>
        set((s) => ({
          recipes: [
            {
              id: uid("rcp"),
              title: r.title,
              ingredients: r.ingredients,
              steps: r.steps,
              timeMinutes: r.timeMinutes,
              calories: r.calories,
              favorite,
              usesItems: r.usesItems,
              createdAt: new Date().toISOString(),
            },
            ...s.recipes,
          ].slice(0, 50),
        })),
      toggleFavorite: (id) =>
        set((s) => ({
          recipes: s.recipes.map((r) =>
            r.id === id ? { ...r, favorite: !r.favorite } : r
          ),
        })),
      removeRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),
    }),
    { name: "mdp-cooking" }
  )
);
