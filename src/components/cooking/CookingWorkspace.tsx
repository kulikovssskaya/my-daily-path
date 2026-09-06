"use client";

import * as React from "react";
import {
  Refrigerator,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  ChefHat,
  Heart,
  Clock,
  Flame,
  Download,
} from "lucide-react";
import { useCookingStore } from "@/stores/cookingStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { postAI } from "@/lib/aiClient";
import type { AIRecipe } from "@/lib/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/useMounted";
import { downloadTextFile } from "@/lib/utils";

function fridgeListFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `fridge-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.txt`;
}

function formatFridgeAsText(names: string[]): string {
  const lines = names.map((n) => n.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return ["Fridge", "", ...lines.map((name) => `- ${name}`)].join("\n");
}

function FridgeCard() {
  const { fridge, addItem, updateItem, removeItem, applyFridgeCommand } = useCookingStore();
  const [manual, setManual] = React.useState("");
  const [nl, setNl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);

  const parseNL = async () => {
    if (!nl.trim()) return;
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const res = await postAI<{
        data: { add: { name: string; qty?: string }[]; remove: string[]; reasoning?: string };
      }>("/api/ai/fridge-command", {
        instruction: nl,
        fridge: fridge.map((f) => f.name),
      });
      const { added, removed } = applyFridgeCommand(res.data.add, res.data.remove);
      setNl("");
      setNote(
        `Added ${added}, removed ${removed}.` +
          (res.data.reasoning ? ` ${res.data.reasoning}` : "")
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process the command.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Refrigerator className="size-4" />
        </span>
        <CardTitle className="text-sm">Fridge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            AI command — add or remove in any language/format
          </label>
          <div className="flex gap-2">
            <textarea
              value={nl}
              onChange={(e) => setNl(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") parseNL();
              }}
              rows={2}
              placeholder="e.g. add 5 eggs and milk · remove chicken · убери яйца, добавь молоко"
              className="min-w-0 flex-1 resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button onClick={parseNL} disabled={loading || !nl.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>

        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manual.trim()) {
                addItem(manual.trim());
                setManual("");
              }
            }}
            placeholder="Add a single item manually"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            variant="secondary"
            onClick={() => {
              if (!manual.trim()) return;
              addItem(manual.trim());
              setManual("");
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {fridge.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Your fridge is empty. Add items above.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{fridge.length} items</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => {
                  const text = formatFridgeAsText(fridge.map((f) => f.name));
                  if (!text) return;
                  downloadTextFile(fridgeListFilename(), text);
                }}
              >
                <Download className="size-3" />
                Download list
              </Button>
            </div>
            <ul className="space-y-1.5">
              {fridge.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                  <input
                    value={f.name}
                    onChange={(e) => updateItem(f.id, { name: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                  <button
                    onClick={() => removeItem(f.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RecipeCard({ recipe, onSave }: { recipe: AIRecipe; onSave: (fav: boolean) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setOpen((v) => !v)} className="text-left">
          <h4 className="text-sm font-semibold">{recipe.title}</h4>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {recipe.timeMinutes} min
            </span>
            {recipe.calories ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3" />
                {recipe.calories} kcal
              </span>
            ) : null}
            <span>{recipe.ingredients.length} ingredients</span>
          </div>
        </button>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onSave(true)} title="Add to favorites">
            <Heart className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSave(false)}>
            Save
          </Button>
        </div>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t pt-3 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Ingredients</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {recipe.ingredients.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Steps</p>
            <ol className="list-inside list-decimal space-y-1">
              {recipe.steps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionsCard() {
  const fridge = useCookingStore((s) => s.fridge);
  const saveRecipe = useCookingStore((s) => s.saveRecipe);
  const [request, setRequest] = React.useState("");
  const [recipes, setRecipes] = React.useState<AIRecipe[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const suggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const memory = useMemoryStore.getState().snapshot();
      const res = await postAI<{ data: { recipes: AIRecipe[] } }>("/api/ai/recipes", {
        fridge: fridge.map((f) => f.name),
        request,
        memory,
      });
      setRecipes(res.data.recipes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get recipes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ChefHat className="size-4" />
        </span>
        <CardTitle className="text-sm">What should I cook today?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") suggest();
            }}
            rows={2}
            placeholder="e.g. chicken wings thawing today — dinner with them · quick pasta · что-то из яиц на завтрак"
            className="min-w-0 flex-1 resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={suggest} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Suggest
          </Button>
        </div>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        {recipes.length > 0 ? (
          <div className="space-y-2">
            {recipes.map((r, i) => (
              <RecipeCard key={i} recipe={r} onSave={(fav) => saveRecipe(r, fav)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Describe what you want in your own words — thawing food, dinner tonight, a specific ingredient.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SavedRecipesCard() {
  const recipes = useCookingStore((s) => s.recipes);
  const toggleFavorite = useCookingStore((s) => s.toggleFavorite);
  const removeRecipe = useCookingStore((s) => s.removeRecipe);

  if (recipes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Heart className="size-4" />
        </span>
        <CardTitle className="text-sm">Favorite recipes & history</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {recipes.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <button
                onClick={() => toggleFavorite(r.id)}
                className={r.favorite ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}
                title="Favorite"
              >
                <Heart className={`size-4 ${r.favorite ? "fill-current" : ""}`} />
              </button>
              <span className="flex-1 truncate">{r.title}</span>
              <span className="text-xs text-muted-foreground">{r.timeMinutes} min</span>
              <button
                onClick={() => removeRecipe(r.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CookingWorkspace() {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-64 animate-pulse rounded-xl border bg-card" />
        <div className="h-48 animate-pulse rounded-xl border bg-card" />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <FridgeCard />
        <SuggestionsCard />
      </div>
      <SavedRecipesCard />
    </div>
  );
}
