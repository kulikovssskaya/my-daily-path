"use client";

import * as React from "react";
import {
  Linkedin,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Trash2,
  Bell,
  Send,
} from "lucide-react";
import { useCareerStore } from "@/stores/careerStore";
import { useMemoryStore } from "@/stores/memoryStore";
import { postAI } from "@/lib/aiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LinkedInSection() {
  const {
    posts,
    addPosts,
    updatePost,
    removePost,
    linkedInConnected,
    setLinkedInConnected,
  } = useCareerStore();
  const [context, setContext] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("linkedin");
    if (status === "connected") setLinkedInConnected(true);
    if (status === "notconfigured") {
      setNotice(
        "LinkedIn is not connected yet. To enable it, create a LinkedIn app and add LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET to .env.local, then restart the app."
      );
    }
    if (status) {
      // Clean the URL so the message doesn't persist on refresh.
      window.history.replaceState({}, "", "/career");
    }
  }, [setLinkedInConnected]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const memory = useMemoryStore.getState().snapshot();
      const res = await postAI<{ data: { ideas: { topic: string; draft: string }[] } }>(
        "/api/ai/post",
        { memory, context }
      );
      addPosts(res.data.ideas);
      setContext("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate ideas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#0a66c2]/10 text-[#0a66c2]">
            <Linkedin className="size-4" />
          </span>
          <div>
            <CardTitle className="text-sm">LinkedIn</CardTitle>
            <p className="text-xs text-muted-foreground">
              {linkedInConnected ? "Profile connected" : "Daily posts and reminders"}
            </p>
          </div>
        </div>
        {linkedInConnected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" /> Connected
          </span>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => (window.location.href = "/api/auth/linkedin")}>
            <Linkedin className="size-4" />
            Connect
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {notice && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {notice}
          </p>
        )}
        <div className="flex gap-2">
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="Topic or what you did today (for post ideas)"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Post ideas
          </Button>
        </div>
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The AI suggests post ideas, helps you write them and reminds you to publish.
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <div
                key={p.id}
                className={cn("rounded-lg border p-3", p.posted && "opacity-60")}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{p.topic}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(p.draft);
                        setCopiedId(p.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      title="Copy"
                    >
                      {copiedId === p.id ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </button>
                    <button
                      onClick={() => removePost(p.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={p.draft}
                  onChange={(e) => updatePost(p.id, { draft: e.target.value })}
                  rows={4}
                  className="w-full resize-y rounded-lg border bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bell className="size-3.5" />
                    Remind:
                    <input
                      type="date"
                      value={p.scheduledFor ? p.scheduledFor.slice(0, 10) : ""}
                      onChange={(e) =>
                        updatePost(p.id, {
                          scheduledFor: e.target.value ? `${e.target.value}T09:00:00` : undefined,
                        })
                      }
                      className="rounded-md border bg-background px-2 py-1"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={p.posted}
                      onChange={(e) => updatePost(p.id, { posted: e.target.checked })}
                    />
                    <Send className="size-3.5" />
                    Posted
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
