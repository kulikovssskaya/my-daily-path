"use client";

import * as React from "react";
import {
  Linkedin,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Flame,
  Send,
  NotebookPen,
} from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useProgressStore } from "@/stores/progressStore";
import { useCareerStore } from "@/stores/careerStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { postAI } from "@/lib/aiClient";
import {
  formatTodayContext,
  eveningWrapStreak,
  hasEveningWrapToday,
  todayProgressSnapshot,
} from "@/lib/eveningWrap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Idea = { topic: string; draft: string };

export function EveningWrapCard({ compact = false }: { compact?: boolean }) {
  const events = useScheduleStore((s) => s.events);
  const addEvent = useScheduleStore((s) => s.addEvent);
  const logs = useProgressStore((s) => s.logs);
  const addLog = useProgressStore((s) => s.addLog);
  const posts = useCareerStore((s) => s.posts);
  const addPosts = useCareerStore((s) => s.addPosts);
  const updatePost = useCareerStore((s) => s.updatePost);

  const [note, setNote] = React.useState("");
  const [ideas, setIdeas] = React.useState<Idea[]>([]);
  const [selected, setSelected] = React.useState(0);
  const [draft, setDraft] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [savedPostId, setSavedPostId] = React.useState<string | null>(null);

  const snap = React.useMemo(
    () => todayProgressSnapshot(events, logs),
    [events, logs]
  );
  const streak = React.useMemo(
    () => eveningWrapStreak(logs, posts),
    [logs, posts]
  );
  const doneToday = hasEveningWrapToday(logs, posts);

  const todayPost = posts.find(
    (p) => p.eveningWrap && p.sourceDate === snap.date
  );

  React.useEffect(() => {
    if (todayPost && !savedPostId) {
      setSavedPostId(todayPost.id);
      setDraft(todayPost.draft);
      setTopic(todayPost.topic);
    }
  }, [todayPost, savedPostId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const memory = useMemoryStore.getState().snapshot();
      const context = formatTodayContext(snap, note);
      const res = await postAI<{ data: { ideas: Idea[] } } | { ideas: Idea[] }>(
        "/api/ai/post",
        { memory, context, mode: "evening" }
      );
      const list =
        "data" in res && res.data?.ideas
          ? res.data.ideas
          : "ideas" in res
            ? res.ideas
            : [];
      if (!list.length) throw new Error("No drafts returned.");
      setIdeas(list);
      setSelected(0);
      setTopic(list[0].topic);
      setDraft(list[0].draft);
      setSavedPostId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not draft a post.");
    } finally {
      setLoading(false);
    }
  };

  const pickIdea = (idx: number) => {
    setSelected(idx);
    setTopic(ideas[idx].topic);
    setDraft(ideas[idx].draft);
    setSavedPostId(null);
  };

  const saveWrap = () => {
    const text = draft.trim();
    if (!text) return;

    const day = snap.date;

    if (savedPostId || todayPost) {
      const id = savedPostId ?? todayPost!.id;
      updatePost(id, {
        topic: topic.trim() || "Evening summary",
        draft: text,
        eveningWrap: true,
        sourceDate: day,
      });
      setSavedPostId(id);
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const endH = now.getHours();
    const endM = now.getMinutes();
    const startMin = endH * 60 + endM - 15;
    const startH = Math.max(0, Math.floor(startMin / 60));
    const startM = ((startMin % 60) + 60) % 60;
    const start = `${day}T${pad(startH)}:${pad(startM)}:00`;
    const end = `${day}T${pad(endH)}:${pad(endM)}:00`;

    const eventId = addEvent({
      title: "Evening LinkedIn summary",
      category: "habit",
      start,
      end,
      status: "done",
      priority: 2,
      notes: topic || "Evening wrap",
      meta: { track: "Reflection" },
    });

    const [postId] = addPosts([
      {
        topic: topic.trim() || "Evening summary",
        draft: text,
        sourceDate: day,
        eveningWrap: true,
      },
    ]);

    const logId = addLog(
      `Evening summary · ${topic.trim() || "LinkedIn"}\n\n${text}`,
      {
        calendarEventId: eventId,
        kind: "evening-summary",
        linkedInPostId: postId,
      }
    );

    updatePost(postId, { dailyLogId: logId });
    setSavedPostId(postId);
    setNote("");
  };

  const copyDraft = async () => {
    if (!draft.trim()) return;
    await navigator.clipboard?.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const markPosted = () => {
    if (savedPostId) updatePost(savedPostId, { posted: true });
    window.open("https://www.linkedin.com/feed/", "_blank", "noopener,noreferrer");
  };

  return (
    <Card className={cn(doneToday && "border-emerald-500/30")}>
      <CardHeader className="flex-row items-start gap-3 space-y-0 pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0a66c2]/10 text-[#0a66c2]">
          <Linkedin className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm">Evening wrap → LinkedIn</CardTitle>
          <p className="text-xs text-muted-foreground">
            Turn today’s calendar into a post. Saves to Daily notes + Agenda.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
          <Flame className="size-3.5" />
          {streak}d
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {doneToday && !draft ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Evening wrap saved for today. Streak: {streak}d. Come back tomorrow.
          </p>
        ) : null}

        {!doneToday || draft ? (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={compact ? 2 : 3}
              placeholder="Optional: one insight, struggle, or win to weave into the post…"
              className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={generate} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Draft from today
              </Button>
              {draft.trim() && !savedPostId ? (
                <Button variant="secondary" onClick={saveWrap}>
                  <NotebookPen className="size-4" />
                  Save to Daily
                </Button>
              ) : null}
              {draft.trim() ? (
                <Button variant="outline" onClick={copyDraft}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
              {savedPostId ? (
                <Button variant="secondary" onClick={markPosted}>
                  <Send className="size-4" />
                  Open LinkedIn
                </Button>
              ) : null}
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {ideas.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {ideas.map((idea, idx) => (
                  <button
                    key={idea.topic + idx}
                    type="button"
                    onClick={() => pickIdea(idx)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      selected === idx
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Option {idx + 1}
                  </button>
                ))}
              </div>
            ) : null}

            {draft ? (
              <div className="space-y-2">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Topic"
                />
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setSavedPostId(null);
                  }}
                  rows={compact ? 5 : 7}
                  className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {savedPostId ? (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3.5" />
                    Saved to Daily + Agenda · copy &amp; paste into LinkedIn
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Save adds a Daily note and a done “Evening LinkedIn summary” block on
                    today’s Agenda. Auto-publish to LinkedIn isn’t wired yet — copy works
                    today.
                  </p>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Quiet reminder on Schedule when evening approaches and wrap isn’t done. */
export function EveningWrapNudge() {
  const logs = useProgressStore((s) => s.logs);
  const posts = useCareerStore((s) => s.posts);
  const hour = new Date().getHours();
  if (hour < 18 || hasEveningWrapToday(logs, posts)) return null;

  return (
    <a
      href="#evening-wrap"
      className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
    >
      <Flame className="size-4 shrink-0" />
      <span>
        Evening ritual: turn today’s learning into a LinkedIn post — keep the streak.
      </span>
    </a>
  );
}
